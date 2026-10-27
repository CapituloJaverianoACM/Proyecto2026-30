// Lexer: convierte el código fuente en tokens con línea y columna (base 1).

import { ErrorLenguaje } from './errors';

export type TipoToken = 'entero' | 'decimal' | 'texto' | 'caracter' | 'ident' | 'kw' | 'op' | 'fin';

export interface Token {
  tipo: TipoToken;
  // Texto del token. Para 'texto' y 'caracter' ya viene sin comillas ni escapes.
  valor: string;
  linea: number;
  columna: number;
  // Columna justo después del token (para reportar "falta ;" donde corresponde).
  columnaFin: number;
  // Solo 'decimal': true si termina en f (literal float).
  esFloat?: boolean;
}

export const PALABRAS_CLAVE = new Set([
  'int', 'float', 'double', 'bool', 'char', 'string', 'void', 'const',
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return',
  'true', 'false', 'using', 'namespace',
]);

// Operadores de dos caracteres primero, para que "<=" no se lea como "<" y "=".
const OPERADORES_2 = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%='];
const OPERADORES_1 = '+-*/%<>=!(){};,[]';

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"', '0': '\0' };

const esDigito = (c: string) => c >= '0' && c <= '9';
const esInicioIdent = (c: string) => /[A-Za-z_]/.test(c);
const esParteIdent = (c: string) => /[A-Za-z0-9_]/.test(c);

export function tokenizar(fuente: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let linea = 1;
  let columna = 1;

  const avanzar = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (fuente[i] === '\n') {
        linea++;
        columna = 1;
      } else {
        columna++;
      }
      i++;
    }
  };
  const error = (mensaje: string, l = linea, c = columna) => new ErrorLenguaje('lexico', mensaje, l, c);

  // Lee un literal entre comillas (' o ") procesando escapes.
  const leerLiteral = (comilla: string): string => {
    const l0 = linea;
    const c0 = columna;
    avanzar(); // comilla de apertura
    let texto = '';
    for (;;) {
      const c = fuente[i];
      if (c === undefined || c === '\n') throw error('Falta cerrar las comillas', l0, c0);
      if (c === comilla) {
        avanzar();
        return texto;
      }
      if (c === '\\') {
        const sig = fuente[i + 1] ?? '';
        const real = ESCAPES[sig];
        if (real === undefined) throw error(`Secuencia de escape no soportada: \\${sig}`);
        texto += real;
        avanzar(2);
      } else {
        texto += c;
        avanzar();
      }
    }
  };

  while (i < fuente.length) {
    const c = fuente[i]!;

    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      avanzar();
      continue;
    }

    // Comentarios
    if (c === '/' && fuente[i + 1] === '/') {
      while (i < fuente.length && fuente[i] !== '\n') avanzar();
      continue;
    }
    if (c === '/' && fuente[i + 1] === '*') {
      const l0 = linea;
      const c0 = columna;
      avanzar(2);
      while (i < fuente.length && !(fuente[i] === '*' && fuente[i + 1] === '/')) avanzar();
      if (i >= fuente.length) throw error('Falta cerrar el comentario /* */', l0, c0);
      avanzar(2);
      continue;
    }

    // Directivas: solo #include se ignora; el resto no tiene sentido sin preprocesador.
    if (c === '#') {
      const l0 = linea;
      const c0 = columna;
      let texto = '';
      while (i < fuente.length && fuente[i] !== '\n') {
        texto += fuente[i];
        avanzar();
      }
      if (!/^#\s*include\b/.test(texto)) {
        throw error('Solo se admite #include (se ignora). Las demás directivas no están soportadas', l0, c0);
      }
      continue;
    }

    const l0 = linea;
    const c0 = columna;
    const empuja = (tipo: TipoToken, valor: string, extra: Partial<Token> = {}) =>
      tokens.push({ tipo, valor, linea: l0, columna: c0, columnaFin: columna, ...extra });

    if (esDigito(c)) {
      let texto = '';
      while (esDigito(fuente[i] ?? '')) {
        texto += fuente[i];
        avanzar();
      }
      let decimal = false;
      if (fuente[i] === '.' && esDigito(fuente[i + 1] ?? '')) {
        decimal = true;
        texto += '.';
        avanzar();
        while (esDigito(fuente[i] ?? '')) {
          texto += fuente[i];
          avanzar();
        }
      }
      let esFloat = false;
      if (fuente[i] === 'f' || fuente[i] === 'F') {
        esFloat = true;
        decimal = true;
        avanzar();
      }
      if (esParteIdent(fuente[i] ?? '')) throw error(`Número mal formado: "${texto}${fuente[i]}"`, l0, c0);
      empuja(decimal ? 'decimal' : 'entero', texto, decimal ? { esFloat } : {});
      continue;
    }

    if (esInicioIdent(c)) {
      let texto = '';
      while (esParteIdent(fuente[i] ?? '')) {
        texto += fuente[i];
        avanzar();
      }
      empuja(PALABRAS_CLAVE.has(texto) ? 'kw' : 'ident', texto);
      continue;
    }

    if (c === '"') {
      const texto = leerLiteral('"');
      empuja('texto', texto);
      continue;
    }

    if (c === "'") {
      const texto = leerLiteral("'");
      if (texto.length !== 1) throw error('Un carácter entre comillas simples debe tener exactamente 1 letra', l0, c0);
      empuja('caracter', texto);
      continue;
    }

    const dos = fuente.substr(i, 2);
    if (OPERADORES_2.includes(dos)) {
      avanzar(2);
      empuja('op', dos);
      continue;
    }
    if (OPERADORES_1.includes(c)) {
      avanzar();
      empuja('op', c);
      continue;
    }

    throw error(`Carácter no soportado: "${c}"`);
  }

  tokens.push({ tipo: 'fin', valor: '', linea, columna, columnaFin: columna });
  return tokens;
}
