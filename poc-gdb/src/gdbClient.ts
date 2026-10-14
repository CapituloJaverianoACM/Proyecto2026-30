/*
  Cliente de GDB/MI. Cómo se sincroniza:

   1. send("-exec-next") escribe "7-exec-next" (7 = token) y espera la línea "7^running".
   2. Después GDB ejecuta el programa y avisa con "*stopped,..." (waitStop).
   3. Si algo no responde en `timeoutMs`, o gdb muere, las promesas se rechazan.

 Los comandos se envían de uno en uno: quien llama hace `await` antes del siguiente.
*/

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as readline from 'node:readline';
import { aVariables, parsearLineaMi, type MiTupla, type RegistroMi, type VariableMi } from './miParser.js';

export interface Parada {
  // motivo de la parada, ej. breakpoint-hit, end-stepping-range, exited-normally, exited, signal-received, etc
  motivo: string;
  // código de salida, ej. "0" o "1" 
  codigoSalida?: string;
  linea?: number;
  // true si el frame tiene archivo y línea de código fuente
  conFuente: boolean;
}

interface ComandoPendiente {
  comando: string;
  resolver: (r: RegistroMi) => void;
  rechazar: (e: Error) => void;
  temporizador: NodeJS.Timeout;
}

interface EsperaParada {
  resolver: (p: Parada) => void;
  rechazar: (e: Error) => void;
  temporizador: NodeJS.Timeout;
}

export class GdbClient {
  private proceso: ChildProcessWithoutNullStreams;
  private siguienteToken = 1;
  private comandosPendientes = new Map<number, ComandoPendiente>();
  // Un *stopped puede llegar antes de que alguien lo espere: se guarda en esta cola.
  private paradasEnCola: Parada[] = [];
  private esperaParada: EsperaParada | null = null;
  private muerto: Error | null = null;
  private cerrado: Promise<void>;

  constructor(binario: string, private timeoutMs = 5000) {
    this.proceso = spawn('gdb', ['--interpreter=mi3', '--quiet', binario], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.cerrado = new Promise((resolver) => this.proceso.once('close', () => resolver()));

    this.proceso.on('error', (e: NodeJS.ErrnoException) =>
      this.fallar(new Error(e.code === 'ENOENT' ? 'gdb no encontrado en el PATH' : `Error de gdb: ${e.message}`)),
    );
    this.proceso.on('close', (codigo, senal) =>
      this.fallar(new Error(`gdb terminó inesperadamente (código ${codigo}, señal ${senal})`)),
    );
    this.proceso.stdin.on('error', () => { /* EPIPE: ya lo avisa el evento 'close' */ });
    this.proceso.stderr.on('data', () => { /* no se necesita */ });

    readline
      .createInterface({ input: this.proceso.stdout, crlfDelay: Infinity })
      .on('line', (linea) => this.alRecibirLinea(linea));
  }

  // ---------- API pública ----------

  // Envía un comando MI y espera su respuesta (^done, ^running...). Rechaza con ^error.
  send(comando: string): Promise<RegistroMi> {
    if (this.muerto) return Promise.reject(this.muerto);
    const token = this.siguienteToken++;
    return new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(() => {
        this.comandosPendientes.delete(token);
        rechazar(new Error(`Timeout (${this.timeoutMs} ms) esperando respuesta a: ${comando}`));
      }, this.timeoutMs);
      this.comandosPendientes.set(token, { comando, resolver, rechazar, temporizador });
      this.proceso.stdin.write(`${token}${comando}\n`);
    });
  }

  // Espera el siguiente *stopped.
  waitStop(): Promise<Parada> {
    const guardada = this.paradasEnCola.shift();
    if (guardada) return Promise.resolve(guardada);
    if (this.muerto) return Promise.reject(this.muerto);

    return new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(() => {
        this.esperaParada = null;
        rechazar(new Error(`Timeout (${this.timeoutMs} ms) esperando *stopped`));
      }, this.timeoutMs);
      this.esperaParada = { resolver, rechazar, temporizador };
    });
  }

  // Comando que reanuda el programa (-exec-run/next/continue): espera ^running y luego *stopped.
  async exec(comando: string): Promise<Parada> {
    await this.send(comando);
    return this.waitStop();
  }

  async listarVariables(): Promise<VariableMi[]> {
    const r = await this.send('-stack-list-variables --simple-values');
    return aVariables(r.datos.variables);
  }

  // Cierra gdb (que mata también al programa) y espera a que el proceso termine.
  async close(): Promise<void> {
    if (!this.muerto) {
      try {
        this.proceso.stdin.write('-gdb-exit\n');
      } catch { /* ya estaba cerrado */ }
    }
    const matar = setTimeout(() => this.proceso.kill('SIGKILL'), 2000);
    await this.cerrado;
    clearTimeout(matar);
  }

  // ---------- Internos ----------

  private alRecibirLinea(linea: string): void {
    const registro = parsearLineaMi(linea);
    if (!registro) return; // "(gdb)", salida del programa o basura

    if (registro.tipo === 'result') this.manejarResultado(registro);
    else if (registro.tipo === 'exec' && registro.clase === 'stopped') this.manejarParada(registro);
    // '=' notificaciones y streams '~' '@' '&': no se necesitan
  }

  // Empareja el ^resultado con el comando que lo originó usando el token.
  private manejarResultado(r: RegistroMi): void {
    const pendiente = r.token !== undefined ? this.comandosPendientes.get(r.token) : undefined;
    if (!pendiente || r.token === undefined) return;

    this.comandosPendientes.delete(r.token);
    clearTimeout(pendiente.temporizador);
    if (r.clase === 'error') {
      pendiente.rechazar(new Error(`${pendiente.comando}: ${String(r.datos.msg ?? 'error de gdb')}`));
    } else {
      pendiente.resolver(r);
    }
  }

  private manejarParada(r: RegistroMi): void {
    const parada = aParada(r.datos);
    if (this.esperaParada) {
      const espera = this.esperaParada;
      this.esperaParada = null;
      clearTimeout(espera.temporizador);
      espera.resolver(parada);
    } else {
      this.paradasEnCola.push(parada);
    }
  }

  // gdb murió o falló: rechaza todo lo que estuviera esperando.
  private fallar(error: Error): void {
    if (this.muerto) return;
    this.muerto = error;
    for (const p of this.comandosPendientes.values()) {
      clearTimeout(p.temporizador);
      p.rechazar(error);
    }
    this.comandosPendientes.clear();
    if (this.esperaParada) {
      clearTimeout(this.esperaParada.temporizador);
      this.esperaParada.rechazar(error);
      this.esperaParada = null;
    }
  }
}

// *stopped,reason="...",frame={line="8",...}  ->  Parada
function aParada(d: MiTupla): Parada {
  const frame = typeof d.frame === 'object' && !Array.isArray(d.frame) ? d.frame : {};
  const linea = typeof frame.line === 'string' ? Number(frame.line) : undefined;
  return {
    motivo: typeof d.reason === 'string' ? d.reason : 'desconocido',
    codigoSalida: typeof d['exit-code'] === 'string' ? d['exit-code'] : undefined,
    linea,
    conFuente: linea !== undefined && typeof frame.file === 'string',
  };
}
