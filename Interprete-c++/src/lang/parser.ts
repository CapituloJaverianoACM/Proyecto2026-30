// Parser de descenso recursivo. Construye el AST y valida la sintaxis.
//
// Precedencia (de menor a mayor), igual que C++:
//   =  +=  -=  *=  /=  %=    (derecha a izquierda)
//   ||
//   &&
//   ==  !=
//   <  >  <=  >=
//   +  -
//   *  /  %
//   !  -  +  ++  --          (unarios, prefijos)
//   ++  --  f(...)           (postfijos y llamadas)

import type {
  Declaracion, Declarado, Expr, FuncionDecl, OpAsignacion, Parametro, Programa, Sentencia, TipoDato, TipoRetorno,
} from './ast';
import { ErrorLenguaje } from './errors';
import { tokenizar, type Token } from './lexer';

const TIPOS_DATO = new Set<string>(['int', 'float', 'double', 'bool', 'char', 'string']);
const OPS_ASIGNACION = new Set<string>(['=', '+=', '-=', '*=', '/=', '%=']);
const NIVELES_BINARIOS: string[][] = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
const INT_MAX = 2147483647;

export function parsear(fuente: string): Programa {
  return new Parser(tokenizar(fuente)).programa();
}

class Parser {
  private i = 0;
  // Cuántos ciclos envuelven la posición actual (para validar break/continue).
  private profundidadCiclo = 0;

  constructor(private tokens: Token[]) {}

  // ---------- utilidades ----------

  private get actual(): Token {
    return this.tokens[this.i]!;
  }
  private mirar(n: number): Token {
    return this.tokens[Math.min(this.i + n, this.tokens.length - 1)]!;
  }
  private avanzar(): Token {
    const t = this.actual;
    if (t.tipo !== 'fin') this.i++;
    return t;
  }
  private es(tipo: Token['tipo'], valor?: string, t = this.actual): boolean {
    return t.tipo === tipo && (valor === undefined || t.valor === valor);
  }
  private esOp(valor: string, t = this.actual): boolean {
    return this.es('op', valor, t);
  }
  private esKw(valor: string, t = this.actual): boolean {
    return this.es('kw', valor, t);
  }
  private aceptarOp(valor: string): boolean {
    if (!this.esOp(valor)) return false;
    this.avanzar();
    return true;
  }
  private describir(t: Token): string {
    return t.tipo === 'fin' ? 'el final del código' : `"${t.valor}"`;
  }
  private error(mensaje: string, t = this.actual): ErrorLenguaje {
    return new ErrorLenguaje('sintaxis', mensaje, t.linea, t.columna);
  }
  // "Falta algo": se reporta justo después del token anterior, como hace g++.
  private esperarOp(valor: string, contexto = ''): Token {
    if (this.esOp(valor)) return this.avanzar();
    const previo = this.i > 0 ? this.tokens[this.i - 1]! : undefined;
    const mensaje = `Se esperaba "${valor}"${contexto} pero se encontró ${this.describir(this.actual)}`;
    if (previo && valor !== '(') throw this.error(mensaje, { ...previo, columna: previo.columnaFin });
    throw this.error(mensaje);
  }
  private esperarIdent(contexto: string): Token {
    if (this.es('ident')) return this.avanzar();
    throw this.error(`Se esperaba un nombre ${contexto} pero se encontró ${this.describir(this.actual)}`);
  }

  // ---------- programa ----------

  programa(): Programa {
    const funciones: FuncionDecl[] = [];
    const sentencias: Sentencia[] = [];
    while (!this.es('fin')) {
      if (this.esKw('using')) {
        this.usingNamespace();
      } else if (this.esInicioFuncion()) {
        funciones.push(this.funcion());
      } else {
        sentencias.push(this.sentencia());
      }
    }
    return { funciones, sentencias };
  }

  // using namespace std;  → se acepta y se ignora (no hay biblioteca estándar).
  private usingNamespace(): void {
    this.avanzar();
    if (!this.esKw('namespace')) throw this.error('Solo se admite "using namespace std;"');
    this.avanzar();
    this.esperarIdent('de espacio de nombres');
    this.esperarOp(';');
  }

  private esInicioFuncion(): boolean {
    const t = this.actual;
    const esTipo = t.tipo === 'kw' && (TIPOS_DATO.has(t.valor) || t.valor === 'void');
    return esTipo && this.es('ident', undefined, this.mirar(1)) && this.esOp('(', this.mirar(2));
  }

  private funcion(): FuncionDecl {
    const tipoTok = this.avanzar();
    const nombre = this.avanzar();
    this.avanzar(); // (
    const params: Parametro[] = [];
    if (!this.esOp(')')) {
      do {
        const t = this.actual;
        if (!(t.tipo === 'kw' && TIPOS_DATO.has(t.valor))) {
          throw this.error(`Se esperaba el tipo de un parámetro pero se encontró ${this.describir(t)}`);
        }
        this.avanzar();
        const p = this.esperarIdent('de parámetro');
        params.push({ tipo: t.valor as TipoDato, nombre: p.valor });
      } while (this.aceptarOp(','));
    }
    this.esperarOp(')');
    if (!this.esOp('{')) throw this.error(`Se esperaba "{" para abrir la función "${nombre.valor}"`);
    // Dentro de una función no heredamos los ciclos de afuera.
    const ciclosPrevios = this.profundidadCiclo;
    this.profundidadCiclo = 0;
    const cuerpo = this.bloque().cuerpo;
    this.profundidadCiclo = ciclosPrevios;
    return {
      linea: nombre.linea, columna: nombre.columna, nombre: nombre.valor,
      retorno: tipoTok.valor as TipoRetorno, params, cuerpo,
    };
  }

  // ---------- sentencias ----------

  private bloque() {
    const llave = this.avanzar(); // {
    const cuerpo: Sentencia[] = [];
    while (!this.esOp('}')) {
      if (this.es('fin')) throw this.error('Falta cerrar la llave "}" que abre este bloque', llave);
      cuerpo.push(this.sentencia());
    }
    this.avanzar();
    return { nodo: 'bloque' as const, linea: llave.linea, columna: llave.columna, cuerpo };
  }

  private sentencia(): Sentencia {
    const t = this.actual;
    const pos = { linea: t.linea, columna: t.columna };

    if (this.esOp('{')) return this.bloque();
    if (this.esOp(';')) {
      this.avanzar();
      return { nodo: 'vacia', ...pos };
    }

    if (t.tipo === 'kw') {
      switch (t.valor) {
        case 'if': return this.sentenciaSi();
        case 'while': return this.sentenciaMientras();
        case 'do': return this.sentenciaHacerMientras();
        case 'for': return this.sentenciaPara();
        case 'break':
        case 'continue': {
          this.avanzar();
          if (this.profundidadCiclo === 0) throw this.error(`"${t.valor}" solo se puede usar dentro de un ciclo`, t);
          this.esperarOp(';');
          return { nodo: t.valor === 'break' ? 'romper' : 'continuar', ...pos };
        }
        case 'return': {
          this.avanzar();
          const valor = this.esOp(';') ? undefined : this.expresion();
          this.esperarOp(';');
          return { nodo: 'retornar', ...pos, ...(valor ? { valor } : {}) };
        }
        case 'void':
          throw this.error('Las funciones solo se pueden declarar fuera de otros bloques', t);
        case 'const':
        case 'int': case 'float': case 'double': case 'bool': case 'char': case 'string': {
          const decl = this.declaracion();
          this.esperarOp(';');
          return decl;
        }
      }
    }

    const expr = this.expresion();
    this.esperarOp(';');
    return { nodo: 'expresion', ...pos, expr };
  }

  // [const] tipo nombre [= expr] {, nombre [= expr]}   (sin el ';' final)
  private declaracion(): Declaracion {
    const inicio = this.actual;
    const esConst = this.esKw('const');
    if (esConst) this.avanzar();
    const tipo = this.actual;
    if (!(tipo.tipo === 'kw' && TIPOS_DATO.has(tipo.valor))) {
      throw this.error(`Se esperaba un tipo (int, float, double, bool, char, string) pero se encontró ${this.describir(tipo)}`);
    }
    this.avanzar();

    const declarados: Declarado[] = [];
    do {
      const nombre = this.esperarIdent('de variable');
      let init: Expr | undefined;
      if (this.aceptarOp('=')) init = this.expresion();
      else if (esConst) throw this.error(`La constante "${nombre.valor}" necesita un valor inicial`, nombre);
      declarados.push({ linea: nombre.linea, columna: nombre.columna, nombre: nombre.valor, ...(init ? { init } : {}) });
    } while (this.aceptarOp(','));

    return {
      nodo: 'declaracion', linea: inicio.linea, columna: inicio.columna,
      tipoDato: tipo.valor as TipoDato, esConst, declarados,
    };
  }

  private condicionEntreParentesis(): Expr {
    this.esperarOp('(', ' después de la palabra clave');
    const cond = this.expresion();
    this.esperarOp(')');
    return cond;
  }

  private sentenciaSi(): Sentencia {
    const t = this.avanzar();
    const cond = this.condicionEntreParentesis();
    const entonces = this.sentencia();
    const sino = this.esKw('else') ? (this.avanzar(), this.sentencia()) : undefined;
    return { nodo: 'si', linea: t.linea, columna: t.columna, cond, entonces, ...(sino ? { sino } : {}) };
  }

  private cuerpoDeCiclo(): Sentencia {
    this.profundidadCiclo++;
    try {
      return this.sentencia();
    } finally {
      this.profundidadCiclo--;
    }
  }

  private sentenciaMientras(): Sentencia {
    const t = this.avanzar();
    const cond = this.condicionEntreParentesis();
    return { nodo: 'mientras', linea: t.linea, columna: t.columna, cond, cuerpo: this.cuerpoDeCiclo() };
  }

  private sentenciaHacerMientras(): Sentencia {
    const t = this.avanzar();
    const cuerpo = this.cuerpoDeCiclo();
    if (!this.esKw('while')) throw this.error('Se esperaba "while" después del cuerpo del do');
    this.avanzar();
    const cond = this.condicionEntreParentesis();
    this.esperarOp(';');
    return { nodo: 'hacerMientras', linea: t.linea, columna: t.columna, cuerpo, cond };
  }

  private sentenciaPara(): Sentencia {
    const t = this.avanzar();
    this.esperarOp('(', ' después de "for"');

    let init: Sentencia | undefined;
    if (!this.esOp(';')) {
      const e = this.actual;
      if (e.tipo === 'kw' && (e.valor === 'const' || TIPOS_DATO.has(e.valor))) {
        init = this.declaracion();
      } else {
        init = { nodo: 'expresion', linea: e.linea, columna: e.columna, expr: this.expresion() };
      }
    }
    this.esperarOp(';');
    const cond = this.esOp(';') ? undefined : this.expresion();
    this.esperarOp(';');
    const paso = this.esOp(')') ? undefined : this.expresion();
    this.esperarOp(')');

    return {
      nodo: 'para', linea: t.linea, columna: t.columna,
      ...(init ? { init } : {}), ...(cond ? { cond } : {}), ...(paso ? { paso } : {}),
      cuerpo: this.cuerpoDeCiclo(),
    };
  }

  // ---------- expresiones ----------

  private expresion(): Expr {
    return this.asignacion();
  }

  // a = b = 3 se agrupa a la derecha: a = (b = 3)
  private asignacion(): Expr {
    const izq = this.binaria(0);
    const t = this.actual;
    if (t.tipo === 'op' && OPS_ASIGNACION.has(t.valor)) {
      if (izq.nodo !== 'variable') throw this.error('Solo se puede asignar a una variable', t);
      this.avanzar();
      const valor = this.asignacion();
      return { nodo: 'asignacion', linea: izq.linea, columna: izq.columna, op: t.valor as OpAsignacion, nombre: izq.nombre, valor };
    }
    return izq;
  }

  private binaria(nivel: number): Expr {
    if (nivel === NIVELES_BINARIOS.length) return this.unaria();
    const ops = NIVELES_BINARIOS[nivel]!;
    let izq = this.binaria(nivel + 1);
    while (this.actual.tipo === 'op' && ops.includes(this.actual.valor)) {
      const t = this.avanzar();
      const der = this.binaria(nivel + 1);
      const base = { linea: t.linea, columna: t.columna, izq, der };
      izq = t.valor === '&&' || t.valor === '||'
        ? { nodo: 'logico', op: t.valor, ...base }
        : { nodo: 'binario', op: t.valor as never, ...base };
    }
    return izq;
  }

  private unaria(): Expr {
    const t = this.actual;
    if (t.tipo === 'op' && (t.valor === '!' || t.valor === '-' || t.valor === '+')) {
      this.avanzar();
      return { nodo: 'unario', linea: t.linea, columna: t.columna, op: t.valor, operando: this.unaria() };
    }
    if (t.tipo === 'op' && (t.valor === '++' || t.valor === '--')) {
      this.avanzar();
      const v = this.actual;
      if (v.tipo !== 'ident') throw this.error(`"${t.valor}" solo se puede aplicar a una variable`, v);
      this.avanzar();
      return { nodo: 'incremento', linea: t.linea, columna: t.columna, op: t.valor, prefijo: true, nombre: v.valor };
    }
    return this.postfija();
  }

  private postfija(): Expr {
    const e = this.primaria();
    const t = this.actual;
    if (t.tipo === 'op' && (t.valor === '++' || t.valor === '--')) {
      if (e.nodo !== 'variable') throw this.error(`"${t.valor}" solo se puede aplicar a una variable`, t);
      this.avanzar();
      return { nodo: 'incremento', linea: e.linea, columna: e.columna, op: t.valor, prefijo: false, nombre: e.nombre };
    }
    return e;
  }

  private primaria(): Expr {
    const t = this.actual;
    const pos = { linea: t.linea, columna: t.columna };

    switch (t.tipo) {
      case 'entero': {
        this.avanzar();
        const n = Number(t.valor);
        if (n > INT_MAX) throw this.error(`El entero ${t.valor} es demasiado grande (máximo ${INT_MAX})`, t);
        return { nodo: 'literal', ...pos, tipoDato: 'int', valor: n };
      }
      case 'decimal':
        this.avanzar();
        return { nodo: 'literal', ...pos, tipoDato: t.esFloat ? 'float' : 'double', valor: t.esFloat ? Math.fround(Number(t.valor)) : Number(t.valor) };
      case 'texto':
        this.avanzar();
        return { nodo: 'literal', ...pos, tipoDato: 'string', valor: t.valor };
      case 'caracter':
        this.avanzar();
        return { nodo: 'literal', ...pos, tipoDato: 'char', valor: t.valor.charCodeAt(0) };
      case 'kw':
        if (t.valor === 'true' || t.valor === 'false') {
          this.avanzar();
          return { nodo: 'literal', ...pos, tipoDato: 'bool', valor: t.valor === 'true' };
        }
        break;
      case 'ident': {
        this.avanzar();
        if (!this.aceptarOp('(')) return { nodo: 'variable', ...pos, nombre: t.valor };
        const args: Expr[] = [];
        if (!this.esOp(')')) {
          do args.push(this.expresion()); while (this.aceptarOp(','));
        }
        this.esperarOp(')', ` al llamar a "${t.valor}"`);
        return { nodo: 'llamada', ...pos, nombre: t.valor, args };
      }
      case 'op':
        if (t.valor === '(') {
          this.avanzar();
          const e = this.expresion();
          this.esperarOp(')');
          return e;
        }
        break;
    }
    throw this.error(`Se esperaba una expresión pero se encontró ${this.describir(t)}`);
  }
}
