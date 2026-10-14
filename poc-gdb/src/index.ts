// PoC: depura un .cpp con GDB/MI y muestra hacia dónde se mueven x e y.
// Uso: npx tsx src/index.ts <archivo.cpp> [--verbose] [--max-steps=N]

import * as fs from 'node:fs';
import * as path from 'node:path';
import { leerOpciones } from './args.js';
import { ResultadoCompilacion, compilar, variablesFaltantes } from './compiler.js';
import { GdbClient, type Parada } from './gdbClient.js';
import { detectarMovimiento, type Posicion } from './movement.js';

const TIMEOUT_GDB_MS = 5000;

// EPIPE (p. ej. `| head`): no abortar sin limpiar.
process.stdout.on('error', () => {});

/** Lee x e y como enteros; null si no están en el frame o aún no son números. */
function leerPosicion(variables: { nombre: string; valor?: string }[]): Posicion | null {
  const leer = (nombre: string) => {
    const valor = variables.find((v) => v.nombre === nombre)?.valor;
    return valor !== undefined && /^-?\d+$/.test(valor) ? Number(valor) : null;
  };
  const x = leer('x');
  const y = leer('y');
  return x === null || y === null ? null : { x, y };
}

/** Comprueba el argumento y que el archivo exista. Devuelve la ruta absoluta o null (error ya mostrado). */
function validarEntrada(archivo: string | undefined): string | null {
  if (!archivo) {
    console.error('Uso: npx tsx src/index.ts <archivo.cpp> [--verbose] [--max-steps=N]');
    return null;
  }
  if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) {
    console.error(`Error: el archivo no existe: ${archivo}`);
    return null;
  }
  return path.resolve(archivo);
}

/** Si la parada es el fin del programa, devuelve el mensaje para mostrar; si no, null. */
function mensajeDeFin(parada: Parada): string | null {
  if (parada.motivo === 'exited-normally' || parada.motivo === 'exited') {
    return `Programa terminado${parada.codigoSalida ? ` (código ${parada.codigoSalida})` : ''}`;
  }
  if (parada.motivo === 'signal-received' || parada.motivo === 'exited-signalled') {
    return `Programa detenido por señal (${parada.motivo})`;
  }
  return null;
}

// Ejecuta paso a paso y compara x e y entre pasos consecutivos.
async function recorrerPrograma(gdb: GdbClient, verbose: boolean, maxPasos: number): Promise<void> {
  // La salida/entrada del programa va a /dev/null para no mezclarse con el MI.
  await gdb.send('-inferior-tty-set /dev/null');
  await gdb.send('-break-insert main');
  let parada = await gdb.exec('-exec-run');

  let anterior: Posicion | null = null;
  let paso = 0;

  for (;;) {
    const fin = mensajeDeFin(parada);
    if (fin) {
      console.log(fin);
      return;
    }
    if (++paso > maxPasos) {
      console.log(`Límite de ${maxPasos} pasos alcanzado`);
      return;
    }

    // La primera parada (entrada a main) tiene x/y sin inicializar (basura): se descarta.
    if (parada.conFuente && paso > 1) {
      const actual = leerPosicion(await gdb.listarVariables());
      if (actual) {
        if (anterior) mostrarMovimiento(parada.linea, anterior, actual, verbose);
        anterior = actual;
      }
    }

    // Fuera del código con símbolos (p. ej. al salir de main) `next` no sirve: continuar.
    parada = await gdb.exec(parada.conFuente ? '-exec-next' : '-exec-continue');
  }
}

function mostrarMovimiento(linea: number | undefined, antes: Posicion, ahora: Posicion, verbose: boolean): void {
  const direccion = detectarMovimiento(antes, ahora);
  if (!direccion && !verbose) return;

  const detalle = `[línea ${linea}] x: ${antes.x} -> ${ahora.x}, y: ${antes.y} -> ${ahora.y}`;
  console.log(`${detalle} | ${direccion ? `Dirección: ${direccion}` : 'sin cambio'}`);
}

async function main(): Promise<number> {
  const { archivo, verbose, maxPasos } = leerOpciones(process.argv.slice(2));
  const fuente = validarEntrada(archivo);
  if (!fuente) return 1;

  console.log('Compilando...');
  let compilado: ResultadoCompilacion;
  try {
    compilado = await compilar(fuente);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
  console.log('Compilación correcta');

  let gdb: GdbClient | undefined;
  const limpiarTodo = async () => {
    await gdb?.close().catch(() => {});
    compilado.limpiar();
  };
  // Ctrl+C: cerrar gdb y borrar el binario antes de salir.
  process.once('SIGINT', () => void limpiarTodo().finally(() => process.exit(130)));

  try {
    const faltantes = variablesFaltantes(fs.readFileSync(fuente, 'utf8'), ['x', 'y']);
    if (faltantes.length) {
      console.error(`Falta declarar la variable int: ${faltantes.join(', ')}`);
      return 1;
    }
    console.log('Variables x e y encontradas');

    gdb = new GdbClient(compilado.rutaBinario, TIMEOUT_GDB_MS);
    await recorrerPrograma(gdb, verbose, maxPasos);
    return 0;
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    return 1;
  } finally {
    await limpiarTodo();
  }
}

main().then((codigo) => process.exit(codigo));
