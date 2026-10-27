import { describe, expect, it } from 'vitest';
import { parsear, tokenizar } from '../src/lang';

describe('lexer', () => {
  it('genera tokens con línea y columna', () => {
    const t = tokenizar('int a = 5;\nb++;');
    expect(t.map((x) => x.valor)).toEqual(['int', 'a', '=', '5', ';', 'b', '++', ';', '']);
    expect(t[0]).toMatchObject({ tipo: 'kw', linea: 1, columna: 1 });
    expect(t[5]).toMatchObject({ tipo: 'ident', linea: 2, columna: 1 });
  });

  it('lee operadores de dos caracteres completos', () => {
    const ops = tokenizar('a <= b >= c == d != e && f || g += 1').filter((x) => x.tipo === 'op').map((x) => x.valor);
    expect(ops).toEqual(['<=', '>=', '==', '!=', '&&', '||', '+=']);
  });

  it('ignora comentarios y #include', () => {
    const t = tokenizar('#include <iostream>\n// hola\nint /* x */ a;');
    expect(t.map((x) => x.valor)).toEqual(['int', 'a', ';', '']);
  });

  it('distingue float, double y entero', () => {
    const [a, b, c] = tokenizar('2.5f 2.5 2');
    expect(a).toMatchObject({ tipo: 'decimal', esFloat: true });
    expect(b).toMatchObject({ tipo: 'decimal', esFloat: false });
    expect(c).toMatchObject({ tipo: 'entero' });
  });

  it('procesa escapes en texto y caracteres', () => {
    const [s, c] = tokenizar(`"a\\nb" '\\t'`);
    expect(s!.valor).toBe('a\nb');
    expect(c!.valor).toBe('\t');
  });

  it.each([
    ['int a = @;', 'Carácter no soportado', 1, 9],
    ['string s = "hola;', 'Falta cerrar las comillas', 1, 12],
    ['/* sin cerrar', 'Falta cerrar el comentario', 1, 1],
    ["char c = 'ab';", 'exactamente 1 letra', 1, 10],
    ['int a = 12abc;', 'Número mal formado', 1, 9],
    ['#define X 1', 'Solo se admite #include', 1, 1],
  ])('error léxico: %s', (codigo, mensaje, linea, columna) => {
    expect(() => tokenizar(codigo)).toThrowError(
      expect.objectContaining({ tipo: 'lexico', linea, columna, message: expect.stringContaining(mensaje) }),
    );
  });
});

describe('parser', () => {
  const primeraExpr = (codigo: string) => {
    const s = parsear(codigo).sentencias[0]!;
    if (s.nodo !== 'expresion') throw new Error('no es expresión');
    return s.expr;
  };

  it('respeta la precedencia: * antes que +', () => {
    expect(primeraExpr('2 + 3 * 4;')).toMatchObject({
      nodo: 'binario', op: '+',
      izq: { valor: 2 },
      der: { nodo: 'binario', op: '*' },
    });
  });

  it('los paréntesis cambian la precedencia', () => {
    expect(primeraExpr('(2 + 3) * 4;')).toMatchObject({
      nodo: 'binario', op: '*',
      izq: { nodo: 'binario', op: '+' },
    });
  });

  it('&& tiene mayor precedencia que ||', () => {
    expect(primeraExpr('a || b && c;')).toMatchObject({ nodo: 'logico', op: '||', der: { nodo: 'logico', op: '&&' } });
  });

  it('la resta es asociativa a la izquierda: 10 - 4 - 3 = (10 - 4) - 3', () => {
    expect(primeraExpr('10 - 4 - 3;')).toMatchObject({ op: '-', izq: { nodo: 'binario', op: '-' }, der: { valor: 3 } });
  });

  it('la asignación es asociativa a la derecha', () => {
    expect(primeraExpr('a = b = 3;')).toMatchObject({ nodo: 'asignacion', nombre: 'a', valor: { nodo: 'asignacion', nombre: 'b' } });
  });

  it('distingue incremento prefijo y postfijo', () => {
    expect(primeraExpr('i++;')).toMatchObject({ nodo: 'incremento', prefijo: false });
    expect(primeraExpr('--i;')).toMatchObject({ nodo: 'incremento', prefijo: true, op: '--' });
  });

  it('else if se anida como un si dentro del sino', () => {
    const s = parsear('if (a) x(); else if (b) y(); else z();').sentencias[0]!;
    expect(s).toMatchObject({ nodo: 'si', sino: { nodo: 'si', sino: { nodo: 'expresion' } } });
  });

  it('for admite partes vacías', () => {
    expect(parsear('for (;;) { break; }').sentencias[0]).toMatchObject({ nodo: 'para' });
  });

  it('separa funciones de sentencias sueltas', () => {
    const p = parsear('int doble(int n) { return n * 2; }\nint x = doble(2);');
    expect(p.funciones.map((f) => f.nombre)).toEqual(['doble']);
    expect(p.sentencias).toHaveLength(1);
  });

  it.each([
    ['int a = 3\nint b = 4;', 'Se esperaba ";"', 1, 10], // el ; falta justo después del 3
    ['if (x > 3 { }', 'Se esperaba ")"', 1, 10],
    ['int a = ;', 'Se esperaba una expresión', 1, 9],
    ['{ int a = 1;', 'Falta cerrar la llave', 1, 1],
    ['break;', 'solo se puede usar dentro de un ciclo', 1, 1],
    ['continue;', 'solo se puede usar dentro de un ciclo', 1, 1],
    ['const int a;', 'necesita un valor inicial', 1, 11],
    ['3 = a;', 'Solo se puede asignar a una variable', 1, 3],
    ['do { } (x);', 'Se esperaba "while"', 1, 8],
    ['void f() { void g() {} }', 'fuera de otros bloques', 1, 12],
  ])('error de sintaxis: %s', (codigo, mensaje, linea, columna) => {
    expect(() => parsear(codigo)).toThrowError(
      expect.objectContaining({ tipo: 'sintaxis', linea, columna, message: expect.stringContaining(mensaje) }),
    );
  });

  it('break dentro de una función no hereda el ciclo de afuera', () => {
    expect(() => parsear('while (true) { void f() { break; } }')).toThrow();
    expect(() => parsear('void f() { break; }')).toThrow(/dentro de un ciclo/);
  });
});
