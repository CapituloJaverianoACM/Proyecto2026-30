// Intérprete: recorre el AST. No usa eval ni new Function.
//
// Está escrito con generadores (function*) para poder PAUSARSE:
//   - yield undefined      -> "ya trabajé bastante, cede el hilo para no congelar la página"
//   - yield <Promise>      -> "una acción del juego está animándose, espera a que termine"
// Quien maneja esas pausas es el runner (runner.ts). El intérprete no sabe nada de Phaser.

import type {
  Expr, FuncionDecl, Programa, Sentencia, TipoDato, TipoRetorno,
} from './ast';
import { ErrorJuego, ErrorLenguaje } from './errors';
import {
  aBool, convertir, desdeJs, negar, operarBinario, promoverUnario, valorPorDefecto, esNumerico,
  type Pos, type Valor,
} from './values';

// Función que el juego pone a disposición del código del estudiante.
export interface FuncionHost {
  nombre: string;
  params: TipoDato[];
  retorno: TipoRetorno;
  // Puede devolver una Promise (animación): el intérprete espera antes de seguir.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args: any[]) => unknown;
}

export interface OpcionesInterprete {
  // Máximo de sentencias/iteraciones ejecutadas antes de abortar (ciclos infinitos).
  maxPasos?: number;
  // Máxima profundidad de llamadas a funciones propias (recursión infinita).
  maxProfundidad?: number;
  // Cada cuántos pasos se cede el hilo al navegador (por defecto 2000, unos pocos ms de trabajo).
  pasosPorTanda?: number;
}

export type Cede = Promise<void> | undefined;

type Senal = { tipo: 'romper' } | { tipo: 'continuar' } | { tipo: 'retornar'; valor?: Valor };

interface Variable {
  tipo: TipoDato;
  valor: Valor;
  esConst: boolean;
}

class Entorno {
  private vars = new Map<string, Variable>();
  constructor(readonly padre?: Entorno) {}

  declarar(nombre: string, v: Variable, p: Pos): void {
    if (this.vars.has(nombre)) {
      throw new ErrorLenguaje('nombre', `La variable "${nombre}" ya fue declarada en este bloque`, p.linea, p.columna);
    }
    this.vars.set(nombre, v);
  }

  buscar(nombre: string): Variable | undefined {
    return this.vars.get(nombre) ?? this.padre?.buscar(nombre);
  }
}

type Gen<T> = Generator<Cede, T, void>;

export class Interprete {
  private funciones = new Map<string, FuncionDecl>();
  private host = new Map<string, FuncionHost>();
  private global = new Entorno();
  private _pasos = 0;
  private enTanda = 0;
  private profundidad = 0;
  private readonly maxPasos: number;
  private readonly maxProfundidad: number;
  private readonly pasosPorTanda: number;

  constructor(private programa: Programa, funcionesHost: FuncionHost[] = [], opciones: OpcionesInterprete = {}) {
    this.maxPasos = opciones.maxPasos ?? 100_000;
    this.maxProfundidad = opciones.maxProfundidad ?? 200;
    this.pasosPorTanda = opciones.pasosPorTanda ?? 2000;
    for (const f of funcionesHost) this.host.set(f.nombre, f);
  }

  get pasos(): number {
    return this._pasos;
  }

  // ---------- ejecución ----------

  *ejecutar(): Gen<void> {
    for (const f of this.programa.funciones) {
      if (this.funciones.has(f.nombre) || this.host.has(f.nombre)) {
        throw new ErrorLenguaje('funcion', `La función "${f.nombre}" ya existe`, f.linea, f.columna);
      }
      this.funciones.set(f.nombre, f);
    }

    for (const s of this.programa.sentencias) {
      const senal = yield* this.ejecutarSentencia(s, this.global);
      if (senal?.tipo === 'retornar') return; // return en el nivel superior termina el programa
    }

    const main = this.funciones.get('main');
    if (main) {
      if (main.params.length > 0) {
        throw new ErrorLenguaje('funcion', '"main" no recibe parámetros en este lenguaje', main.linea, main.columna);
      }
      yield* this.llamarUsuario(main, [], main);
    }
  }

  // ---------- control de presupuesto ----------

  private contar(p: Pos): void {
    if (++this._pasos > this.maxPasos) {
      throw new ErrorLenguaje(
        'limite',
        `El programa superó el límite de ${this.maxPasos} pasos. ¿Hay un ciclo infinito?`,
        p.linea,
        p.columna,
      );
    }
  }

  // Cuenta un paso y, cada cierto número, cede el hilo.
  private *punto(p: Pos): Gen<void> {
    this.contar(p);
    if (++this.enTanda >= this.pasosPorTanda) {
      this.enTanda = 0;
      yield undefined;
    }
  }

  // ---------- sentencias ----------

  private *ejecutarSentencia(s: Sentencia, env: Entorno): Gen<Senal | undefined> {
    yield* this.punto(s);

    switch (s.nodo) {
      case 'vacia':
        return;

      case 'expresion':
        if (s.expr.nodo === 'llamada') yield* this.llamar(s.expr, env); // permite funciones void
        else yield* this.evaluar(s.expr, env);
        return;

      case 'declaracion':
        for (const d of s.declarados) {
          const valor = d.init
            ? convertir(yield* this.evaluar(d.init, env), s.tipoDato, d.init, `al inicializar "${d.nombre}"`)
            : valorPorDefecto(s.tipoDato);
          env.declarar(d.nombre, { tipo: s.tipoDato, valor, esConst: s.esConst }, d);
        }
        return;

      case 'bloque':
        return yield* this.ejecutarBloque(s.cuerpo, env);

      case 'si':
        if (aBool(yield* this.evaluar(s.cond, env), s.cond)) {
          return yield* this.ejecutarSentencia(s.entonces, env);
        }
        if (s.sino) return yield* this.ejecutarSentencia(s.sino, env);
        return;

      case 'mientras':
        while (aBool(yield* this.evaluar(s.cond, env), s.cond)) {
          const senal = yield* this.ejecutarSentencia(s.cuerpo, env);
          if (senal?.tipo === 'romper') break;
          if (senal?.tipo === 'retornar') return senal;
          yield* this.punto(s); // cuenta la iteración aunque el cuerpo esté vacío
        }
        return;

      case 'hacerMientras':
        do {
          const senal = yield* this.ejecutarSentencia(s.cuerpo, env);
          if (senal?.tipo === 'romper') break;
          if (senal?.tipo === 'retornar') return senal;
          yield* this.punto(s);
        } while (aBool(yield* this.evaluar(s.cond, env), s.cond));
        return;

      case 'para': {
        const ambito = new Entorno(env); // la variable del for vive solo dentro del for
        if (s.init) yield* this.ejecutarSentencia(s.init, ambito);
        while (!s.cond || aBool(yield* this.evaluar(s.cond, ambito), s.cond)) {
          const senal = yield* this.ejecutarSentencia(s.cuerpo, ambito);
          if (senal?.tipo === 'romper') break;
          if (senal?.tipo === 'retornar') return senal;
          // 'continuar' cae aquí y salta directo al paso
          if (s.paso) yield* this.evaluar(s.paso, ambito);
          yield* this.punto(s);
        }
        return;
      }

      case 'romper':
        return { tipo: 'romper' };
      case 'continuar':
        return { tipo: 'continuar' };

      case 'retornar': {
        if (!s.valor) return { tipo: 'retornar' };
        return { tipo: 'retornar', valor: yield* this.evaluar(s.valor, env) };
      }
    }
  }

  private *ejecutarBloque(cuerpo: Sentencia[], padre: Entorno): Gen<Senal | undefined> {
    const env = new Entorno(padre);
    for (const s of cuerpo) {
      const senal = yield* this.ejecutarSentencia(s, env);
      if (senal) return senal;
    }
    return undefined;
  }

  // ---------- expresiones ----------

  private *evaluar(e: Expr, env: Entorno): Gen<Valor> {
    switch (e.nodo) {
      case 'literal':
        return { tipo: e.tipoDato, v: e.valor };

      case 'variable':
        return this.variable(e.nombre, e, env).valor;

      case 'unario': {
        const x = yield* this.evaluar(e.operando, env);
        if (e.op === '!') return { tipo: 'bool', v: !aBool(x, e) };
        return e.op === '-' ? negar(x, e) : promoverUnario(x, e);
      }

      case 'binario': {
        const a = yield* this.evaluar(e.izq, env);
        const b = yield* this.evaluar(e.der, env);
        return operarBinario(e.op, a, b, e);
      }

      case 'logico': {
        // Cortocircuito: si el resultado ya se conoce, no se evalúa el lado derecho.
        const izq = aBool(yield* this.evaluar(e.izq, env), e.izq);
        if (e.op === '&&' && !izq) return { tipo: 'bool', v: false };
        if (e.op === '||' && izq) return { tipo: 'bool', v: true };
        return { tipo: 'bool', v: aBool(yield* this.evaluar(e.der, env), e.der) };
      }

      case 'asignacion': {
        const variable = this.variable(e.nombre, e, env);
        if (variable.esConst) {
          throw new ErrorLenguaje('tipo', `No se puede modificar la constante "${e.nombre}"`, e.linea, e.columna);
        }
        const rhs = yield* this.evaluar(e.valor, env);
        const nuevo = e.op === '='
          ? rhs
          : operarBinario(e.op.slice(0, -1) as '+', variable.valor, rhs, e);
        variable.valor = convertir(nuevo, variable.tipo, e, `al asignar a "${e.nombre}"`);
        return variable.valor;
      }

      case 'incremento': {
        const variable = this.variable(e.nombre, e, env);
        if (variable.esConst) {
          throw new ErrorLenguaje('tipo', `No se puede modificar la constante "${e.nombre}"`, e.linea, e.columna);
        }
        if (!esNumerico(variable.tipo) || variable.tipo === 'bool') {
          throw new ErrorLenguaje('tipo', `"${e.op}" no se puede aplicar a "${e.nombre}" (tipo ${variable.tipo})`, e.linea, e.columna);
        }
        const antes = variable.valor;
        const delta = e.op === '++' ? 1 : -1;
        const suma = operarBinario('+', antes, { tipo: 'int', v: delta }, e);
        variable.valor = convertir(suma, variable.tipo, e);
        return e.prefijo ? variable.valor : antes;
      }

      case 'llamada': {
        const r = yield* this.llamar(e, env);
        if (!r) {
          throw new ErrorLenguaje('tipo', `"${e.nombre}" no devuelve ningún valor, no se puede usar en una expresión`, e.linea, e.columna);
        }
        return r;
      }
    }
  }

  private variable(nombre: string, p: Pos, env: Entorno): Variable {
    const v = env.buscar(nombre);
    if (!v) throw new ErrorLenguaje('nombre', `La variable "${nombre}" no está declarada`, p.linea, p.columna);
    return v;
  }

  // ---------- funciones ----------

  // Devuelve undefined si la función es void.
  private *llamar(e: Extract<Expr, { nodo: 'llamada' }>, env: Entorno): Gen<Valor | undefined> {
    const propia = this.funciones.get(e.nombre);
    const delJuego = this.host.get(e.nombre);
    if (!propia && !delJuego) {
      throw new ErrorLenguaje('funcion', `La función "${e.nombre}" no existe`, e.linea, e.columna);
    }

    const tipos = propia ? propia.params.map((p) => p.tipo) : delJuego!.params;
    if (e.args.length !== tipos.length) {
      throw new ErrorLenguaje(
        'funcion',
        `"${e.nombre}" recibe ${tipos.length} argumento(s) y la llamada tiene ${e.args.length}`,
        e.linea,
        e.columna,
      );
    }

    const args: Valor[] = [];
    for (let k = 0; k < e.args.length; k++) {
      const a = yield* this.evaluar(e.args[k]!, env);
      args.push(convertir(a, tipos[k]!, e.args[k]!, `argumento ${k + 1} de "${e.nombre}"`));
    }

    if (propia) return yield* this.llamarUsuario(propia, args, e);
    return yield* this.llamarHost(delJuego!, args, e);
  }

  private *llamarUsuario(f: FuncionDecl, args: Valor[], p: Pos): Gen<Valor | undefined> {
    if (this.profundidad >= this.maxProfundidad) {
      throw new ErrorLenguaje(
        'limite',
        `Demasiadas llamadas anidadas a funciones (más de ${this.maxProfundidad}). ¿Hay una recursión infinita?`,
        p.linea,
        p.columna,
      );
    }
    this.profundidad++;
    try {
      // Las funciones ven las variables globales pero no las locales de quien las llama.
      const env = new Entorno(this.global);
      f.params.forEach((param, k) => env.declarar(param.nombre, { tipo: param.tipo, valor: args[k]!, esConst: false }, f));

      for (const s of f.cuerpo) {
        const senal = yield* this.ejecutarSentencia(s, env);
        if (senal?.tipo !== 'retornar') continue;

        if (f.retorno === 'void') {
          if (senal.valor) {
            throw new ErrorLenguaje('tipo', `La función void "${f.nombre}" no puede devolver un valor`, p.linea, p.columna);
          }
          return undefined;
        }
        if (!senal.valor) {
          throw new ErrorLenguaje('tipo', `La función "${f.nombre}" debe devolver un valor ${f.retorno}`, p.linea, p.columna);
        }
        return convertir(senal.valor, f.retorno, p, `valor de retorno de "${f.nombre}"`);
      }

      if (f.retorno !== 'void' && f.nombre !== 'main') {
        throw new ErrorLenguaje('ejecucion', `La función "${f.nombre}" terminó sin devolver un valor (falta return)`, p.linea, p.columna);
      }
      return undefined;
    } finally {
      this.profundidad--;
    }
  }

  private *llamarHost(f: FuncionHost, args: Valor[], p: Pos): Gen<Valor | undefined> {
    let resultado: unknown;
    try {
      resultado = f.fn(...args.map((a) => a.v));
    } catch (err) {
      throw this.envolver(err, f.nombre, p);
    }

    // Acción asíncrona (animación): se cede la Promise y el runner la espera.
    if (resultado instanceof Promise) {
      try {
        yield resultado as Promise<void>;
      } catch (err) {
        throw this.envolver(err, f.nombre, p);
      }
      resultado = undefined;
    }

    if (f.retorno === 'void') return undefined;
    return desdeJs(resultado, f.retorno, f.nombre, p);
  }

  private envolver(err: unknown, nombre: string, p: Pos): Error {
    if (err instanceof ErrorLenguaje) return err;
    if (err instanceof ErrorJuego) return new ErrorLenguaje('juego', err.message, p.linea, p.columna);
    return new ErrorLenguaje('ejecucion', `Falló la función "${nombre}"`, p.linea, p.columna);
  }
}
