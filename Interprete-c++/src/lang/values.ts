// Valores en tiempo de ejecución y reglas de conversión/operación.
//
// Representación:
//   int, float, double, char -> number (char guarda el código del carácter)
//   bool                     -> boolean
//   string                   -> string
//
// Conversiones permitidas al asignar, inicializar, pasar argumentos o devolver:
//   a int     : int, bool, char          (double/float -> ERROR: perdería decimales)
//   a float   : int, bool, char, float, double
//   a double  : int, bool, char, float, double
//   a bool    : cualquier número o bool  (distinto de 0 => true)
//   a char    : solo char                (int -> ERROR; usa 'a')
//   a string  : solo string              (char/número -> ERROR)
// Cualquier otra combinación es un error de tipos.

import type { TipoDato } from './ast';
import { ErrorLenguaje } from './errors';

export interface Valor {
  tipo: TipoDato;
  v: number | boolean | string;
}

export interface Pos {
  linea: number;
  columna: number;
}

const INT_NUMERICOS = new Set<TipoDato>(['int', 'bool', 'char']);
const NUMERICOS = new Set<TipoDato>(['int', 'bool', 'char', 'float', 'double']);

export const esNumerico = (t: TipoDato) => NUMERICOS.has(t);
const esEnteroLike = (t: TipoDato) => INT_NUMERICOS.has(t);

const errorTipo = (mensaje: string, p: Pos) => new ErrorLenguaje('tipo', mensaje, p.linea, p.columna);

export function valorPorDefecto(tipo: TipoDato): Valor {
  // Sin inicializar => cero (en C++ real sería basura; aquí es determinista).
  return { tipo, v: tipo === 'bool' ? false : tipo === 'string' ? '' : 0 };
}

// Número de un valor numérico (bool -> 0/1).
const num = (x: Valor): number => (typeof x.v === 'boolean' ? Number(x.v) : (x.v as number));

export function convertir(x: Valor, destino: TipoDato, p: Pos, contexto = ''): Valor {
  const sufijo = contexto ? ` (${contexto})` : '';
  const fallo = (detalle: string) =>
    errorTipo(`No se puede convertir un valor de tipo "${x.tipo}" a "${destino}"${sufijo}: ${detalle}`, p);

  if (x.tipo === destino) return x;

  if (destino === 'string') throw fallo('solo un texto entre comillas dobles puede ser string');
  if (x.tipo === 'string') throw fallo('un texto no es un número ni un bool');

  switch (destino) {
    case 'bool':
      return { tipo: 'bool', v: num(x) !== 0 };
    case 'int':
      if (!esEnteroLike(x.tipo)) throw fallo('se perderían los decimales');
      return { tipo: 'int', v: num(x) };
    case 'float':
      return { tipo: 'float', v: Math.fround(num(x)) };
    case 'double':
      return { tipo: 'double', v: num(x) };
    case 'char':
      throw fallo("usa un carácter entre comillas simples, por ejemplo 'a'");
  }
}

// Condición de if/while/for y operandos de && || !
export function aBool(x: Valor, p: Pos): boolean {
  if (x.tipo === 'string') throw errorTipo('Una condición debe ser bool o número, no un texto', p);
  return num(x) !== 0;
}

// Tipo resultante de operar dos números (bool y char se promueven a int).
function tipoResultado(a: Valor, b: Valor): TipoDato {
  if (a.tipo === 'double' || b.tipo === 'double') return 'double';
  if (a.tipo === 'float' || b.tipo === 'float') return 'float';
  return 'int';
}

export type OpBinario = '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=';

export function operarBinario(op: OpBinario, a: Valor, b: Valor, p: Pos): Valor {
  const hayTexto = a.tipo === 'string' || b.tipo === 'string';

  if (hayTexto) {
    const otro = a.tipo === 'string' ? b : a;
    if (op === '+') {
      // string + string, string + char, char + string (como std::string)
      if (otro.tipo !== 'string' && otro.tipo !== 'char') {
        throw errorTipo(`No se puede sumar un texto con un valor de tipo "${otro.tipo}"`, p);
      }
      const t = (x: Valor) => (x.tipo === 'string' ? (x.v as string) : String.fromCharCode(x.v as number));
      return { tipo: 'string', v: t(a) + t(b) };
    }
    if (a.tipo !== 'string' || b.tipo !== 'string') {
      throw errorTipo(`No se puede aplicar "${op}" entre "${a.tipo}" y "${b.tipo}"`, p);
    }
    const x = a.v as string;
    const y = b.v as string;
    switch (op) {
      case '==': return { tipo: 'bool', v: x === y };
      case '!=': return { tipo: 'bool', v: x !== y };
      case '<': return { tipo: 'bool', v: x < y };
      case '>': return { tipo: 'bool', v: x > y };
      case '<=': return { tipo: 'bool', v: x <= y };
      case '>=': return { tipo: 'bool', v: x >= y };
      default: throw errorTipo(`El operador "${op}" no se puede usar con textos`, p);
    }
  }

  const x = num(a);
  const y = num(b);

  switch (op) {
    case '==': return { tipo: 'bool', v: x === y };
    case '!=': return { tipo: 'bool', v: x !== y };
    case '<': return { tipo: 'bool', v: x < y };
    case '>': return { tipo: 'bool', v: x > y };
    case '<=': return { tipo: 'bool', v: x <= y };
    case '>=': return { tipo: 'bool', v: x >= y };
  }

  const t = tipoResultado(a, b);

  if (op === '%') {
    if (!esEnteroLike(a.tipo) || !esEnteroLike(b.tipo)) {
      throw errorTipo('El operador "%" solo funciona con enteros', p);
    }
    if (y === 0) throw new ErrorLenguaje('ejecucion', 'Módulo entre cero', p.linea, p.columna);
    return { tipo: 'int', v: (x % y) | 0 };
  }

  if (op === '/' && y === 0) {
    throw new ErrorLenguaje('ejecucion', 'División entre cero', p.linea, p.columna);
  }

  let r: number;
  switch (op) {
    case '+': r = x + y; break;
    case '-': r = x - y; break;
    case '*': r = t === 'int' ? Math.imul(x, y) : x * y; break;
    default: r = t === 'int' ? Math.trunc(x / y) : x / y; break; // '/': división entera si ambos son int
  }
  if (t === 'int') r |= 0; // desbordamiento de 32 bits, como en C++
  else if (t === 'float') r = Math.fround(r);
  return { tipo: t, v: r };
}

export function negar(x: Valor, p: Pos): Valor {
  if (x.tipo === 'string') throw errorTipo('No se puede cambiar el signo de un texto', p);
  const t = esEnteroLike(x.tipo) ? 'int' : x.tipo;
  return { tipo: t, v: t === 'int' ? -num(x) | 0 : -num(x) };
}

export function promoverUnario(x: Valor, p: Pos): Valor {
  if (x.tipo === 'string') throw errorTipo('El operador "+" no se puede usar con textos', p);
  return esEnteroLike(x.tipo) ? { tipo: 'int', v: num(x) } : x;
}

// Valor JS (de una función del juego) -> Valor tipado, validando el tipo declarado.
export function desdeJs(js: unknown, tipo: TipoDato, nombre: string, p: Pos): Valor {
  const ok =
    tipo === 'bool' ? typeof js === 'boolean'
    : tipo === 'string' ? typeof js === 'string'
    : typeof js === 'number';
  if (!ok) {
    throw new ErrorLenguaje('ejecucion', `La función "${nombre}" devolvió un valor que no es de tipo ${tipo}`, p.linea, p.columna);
  }
  return { tipo, v: js as Valor['v'] };
}
