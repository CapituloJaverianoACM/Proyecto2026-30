import { describe, expect, it } from 'vitest';
import { ejecutar, type Ejecucion, type FuncionHost } from '../src/lang';
import { correr, hostDePrueba } from './util';

describe('variables y tipos', () => {
  it('declara, inicializa y reasigna', async () => {
    const { salida } = await correr(`
      int pasos = 3;
      float distancia = 2.5;
      bool hayBasura = true;
      int contador = 0;
      contador = contador + 1;
      pasos += 2;
      ver(pasos); ver(contador); verB(hayBasura);
    `);
    expect(salida).toEqual([5, 1, true]);
  });

  it('operadores compuestos', async () => {
    const { salida } = await correr('int a = 10; a -= 3; ver(a); a *= 2; ver(a); a /= 3; ver(a); a %= 3; ver(a);');
    expect(salida).toEqual([7, 14, 4, 1]);
  });

  it('declara varias variables en una línea', async () => {
    const { salida } = await correr('int a = 1, b = 2, c; ver(a + b + c);');
    expect(salida).toEqual([3]); // c sin inicializar vale 0
  });

  it('incremento prefijo y postfijo como expresión', async () => {
    const { salida } = await correr('int i = 5; ver(i++); ver(i); ver(++i); ver(i--); ver(--i);');
    expect(salida).toEqual([5, 6, 7, 7, 5]);
  });

  it('const impide modificar', async () => {
    await expect(correr('const int a = 1; a = 2;')).rejects.toMatchObject({ tipo: 'tipo', linea: 1 });
    await expect(correr('const int a = 1; a++;')).rejects.toMatchObject({ tipo: 'tipo' });
  });

  it('alcance: una variable de un bloque no existe afuera', async () => {
    await expect(correr('{ int a = 1; } ver(a);')).rejects.toMatchObject({ tipo: 'nombre' });
  });

  it('alcance: una variable interna puede ocultar la externa', async () => {
    const { salida } = await correr('int a = 1; { int a = 2; ver(a); } ver(a);');
    expect(salida).toEqual([2, 1]);
  });

  it('la variable de un for no existe después del for', async () => {
    await expect(correr('for (int i = 0; i < 2; i++) {} ver(i);')).rejects.toMatchObject({ tipo: 'nombre' });
  });

  it('no se puede declarar dos veces en el mismo bloque', async () => {
    await expect(correr('int a = 1; int a = 2;')).rejects.toMatchObject({ tipo: 'nombre', linea: 1, columna: 16 });
  });

  describe('conversiones', () => {
    it('int -> double y bool -> int son permitidas', async () => {
      const { salida } = await correr('double d = 3; verD(d); int n = true; ver(n); bool b = 5; verB(b);');
      expect(salida).toEqual([3, 1, true]);
    });

    it('double -> int es error (se perderían decimales)', async () => {
      await expect(correr('int x = 2.5;')).rejects.toMatchObject({ tipo: 'tipo', message: expect.stringContaining('decimales') });
      await expect(correr('int x = 1; x += 0.5;')).rejects.toMatchObject({ tipo: 'tipo' });
    });

    it('int -> char y número <-> string son errores', async () => {
      await expect(correr('char c = 65;')).rejects.toMatchObject({ tipo: 'tipo' });
      await expect(correr('string s = 5;')).rejects.toMatchObject({ tipo: 'tipo' });
      await expect(correr('int n = "5";')).rejects.toMatchObject({ tipo: 'tipo' });
      await expect(correr('string s = "a" + 1;')).rejects.toMatchObject({ tipo: 'tipo' });
    });

    it('char y string', async () => {
      const { salida } = await correr(`
        char c = 'a'; ver(c + 1); verC(c);
        string s = "hola" + ' ' + "mundo"; verS(s);
        bool igual = s == "hola mundo"; verB(igual);
      `);
      expect(salida).toEqual([98, 97, 'hola mundo', true]);
    });

    it('float redondea a precisión simple', async () => {
      const { salida } = await correr('float f = 0.1f; double d = f; verD(d);');
      expect(salida[0]).toBeCloseTo(0.1, 6);
      expect(salida[0]).not.toBe(0.1);
    });

    it('una condición de texto es error', async () => {
      await expect(correr('if ("hola") {}')).rejects.toMatchObject({ tipo: 'tipo' });
    });
  });
});

describe('operadores', () => {
  it('aritmética con precedencia', async () => {
    const { salida } = await correr('ver(2 + 3 * 4); ver((2 + 3) * 4); ver(10 - 4 - 3); ver(2 * 3 % 4); ver(-2 + 5);');
    expect(salida).toEqual([14, 20, 3, 2, 3]);
  });

  it('división entera entre enteros, decimal si alguno es decimal', async () => {
    const { salida } = await correr('ver(7 / 2); ver(-7 / 2); ver(7 % 3); ver(-7 % 3); verD(7 / 2.0); verD(1 / 2);');
    expect(salida).toEqual([3, -3, 1, -1, 3.5, 0]);
  });

  it('desbordamiento de int como en C++ (32 bits)', async () => {
    const { salida } = await correr('int m = 2147483647; ver(m + 1);');
    expect(salida).toEqual([-2147483648]);
  });

  it('comparaciones y lógicos', async () => {
    const { salida } = await correr(`
      verB(1 < 2); verB(2 <= 1); verB(3 == 3); verB(3 != 3); verB(5 > 4); verB(4 >= 5);
      verB(true && false); verB(true || false); verB(!true);
      verB(1 < 2 && 2 < 3 || false);
    `);
    expect(salida).toEqual([true, false, true, false, true, false, false, true, false, true]);
  });

  it('&& y || hacen cortocircuito', async () => {
    const { salida } = await correr('int z = 0; verB(false && 1 / z == 1); verB(true || 1 / z == 1);');
    expect(salida).toEqual([false, true]);
  });

  it('% con decimales es error de tipos', async () => {
    await expect(correr('verD(5.5 % 2);')).rejects.toMatchObject({ tipo: 'tipo' });
  });

  it('división y módulo entre cero', async () => {
    await expect(correr('int a = 1 / 0;')).rejects.toMatchObject({ tipo: 'ejecucion', linea: 1, columna: 11 }); // posición del operador
    await expect(correr('int a = 1 % 0;')).rejects.toMatchObject({ tipo: 'ejecucion' });
    await expect(correr('double a = 1.0 / 0;')).rejects.toMatchObject({ tipo: 'ejecucion' });
  });
});

describe('estructuras de control', () => {
  it('if / else if / else', async () => {
    const programa = (n: number) => `
      int n = ${n};
      if (n < 0) { ver(-1); } else if (n == 0) { ver(0); } else { ver(1); }
    `;
    expect((await correr(programa(-5))).salida).toEqual([-1]);
    expect((await correr(programa(0))).salida).toEqual([0]);
    expect((await correr(programa(9))).salida).toEqual([1]);
  });

  it('if sin llaves', async () => {
    expect((await correr('if (true) ver(1); else ver(2);')).salida).toEqual([1]);
  });

  it('for', async () => {
    const { salida } = await correr('for (int i = 0; i < 4; i++) ver(i);');
    expect(salida).toEqual([0, 1, 2, 3]);
  });

  it('for con partes vacías y break', async () => {
    const { salida } = await correr('int i = 0; for (;;) { if (i == 3) break; ver(i); i++; }');
    expect(salida).toEqual([0, 1, 2]);
  });

  it('while', async () => {
    const { salida } = await correr('int c = 0; while (c < 3) { ver(c); c++; }');
    expect(salida).toEqual([0, 1, 2]);
  });

  it('do while ejecuta al menos una vez', async () => {
    const { salida } = await correr('int c = 10; do { ver(c); c++; } while (c < 3);');
    expect(salida).toEqual([10]);
  });

  it('ciclos anidados', async () => {
    const { salida } = await correr('for (int i = 0; i < 2; i++) for (int j = 0; j < 3; j++) ver2(i, j);');
    expect(salida).toEqual([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]);
  });

  it('break solo sale del ciclo más interno', async () => {
    const { salida } = await correr(`
      for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) { if (j == 1) break; ver2(i, j); }
      }
    `);
    expect(salida).toEqual([[0, 0], [1, 0], [2, 0]]);
  });

  it('continue en for ejecuta el paso; en while salta a la condición', async () => {
    const f = await correr('for (int i = 0; i < 5; i++) { if (i % 2 == 1) continue; ver(i); }');
    expect(f.salida).toEqual([0, 2, 4]);
    const w = await correr('int i = 0; while (i < 5) { i++; if (i == 3) continue; ver(i); }');
    expect(w.salida).toEqual([1, 2, 4, 5]);
  });
});

describe('funciones', () => {
  it('parámetros, return y llamadas anidadas', async () => {
    const { salida } = await correr(`
      int suma(int a, int b) { return a + b; }
      int doble(int n) { return suma(n, n); }
      ver(doble(4));
    `);
    expect(salida).toEqual([8]);
  });

  it('se pueden usar antes de declararlas', async () => {
    expect((await correr('ver(f()); int f() { return 7; }')).salida).toEqual([7]);
  });

  it('recursión', async () => {
    const { salida } = await correr(`
      int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }
      ver(fact(5));
    `);
    expect(salida).toEqual([120]);
  });

  it('void con return anticipado', async () => {
    const { salida } = await correr('void f(int n) { if (n > 1) return; ver(n); } f(5); f(1);');
    expect(salida).toEqual([1]);
  });

  it('los parámetros se pasan por valor y las variables locales no se filtran', async () => {
    const { salida } = await correr('void f(int n) { n = 99; } int x = 1; f(x); ver(x);');
    expect(salida).toEqual([1]);
    await expect(correr('int g() { return afuera; } int afuera = 1; ver(g());')).resolves.toBeDefined(); // globales sí se ven
    await expect(correr('void f() { int local = 1; } f(); ver(local);')).rejects.toMatchObject({ tipo: 'nombre' });
  });

  it('una función no ve las locales de quien la llama', async () => {
    await expect(correr('int f() { return secreto; } { int secreto = 1; ver(f()); }')).rejects.toMatchObject({ tipo: 'nombre' });
  });

  it('convierte argumentos y valor de retorno', async () => {
    const { salida } = await correr('double mitad(double d) { return d / 2; } verD(mitad(5));');
    expect(salida).toEqual([2.5]);
    await expect(correr('void f(int n) {} f(2.5);')).rejects.toMatchObject({ tipo: 'tipo' });
    await expect(correr('int f() { return 1.5; } f();')).rejects.toMatchObject({ tipo: 'tipo' });
  });

  it('errores de llamada', async () => {
    await expect(correr('noExiste();')).rejects.toMatchObject({ tipo: 'funcion', linea: 1, columna: 1 });
    await expect(correr('int f(int a) { return a; } f(1, 2);')).rejects.toMatchObject({ tipo: 'funcion' });
    await expect(correr('ver();')).rejects.toMatchObject({ tipo: 'funcion' });
    await expect(correr('void f() {} int x = f();')).rejects.toMatchObject({ tipo: 'tipo' });
    await expect(correr('int f() { } f();')).rejects.toMatchObject({ tipo: 'ejecucion' });
    await expect(correr('void f() {} void f() {}')).rejects.toMatchObject({ tipo: 'funcion' });
    await expect(correr('void ver(int n) {}')).rejects.toMatchObject({ tipo: 'funcion' }); // choca con una del juego
  });

  it('int main() se ejecuta al final', async () => {
    const { salida } = await correr('int main() { ver(2); return 0; } ver(1);');
    expect(salida).toEqual([1, 2]);
  });

  it('using namespace std; se acepta', async () => {
    expect((await correr('using namespace std; ver(1);')).salida).toEqual([1]);
  });
});

describe('errores de ejecución con posición', () => {
  it('variable no declarada', async () => {
    await expect(correr('int a = 1;\n  b = a + 1;')).rejects.toMatchObject({
      tipo: 'nombre', linea: 2, columna: 3, message: expect.stringContaining('"b" no está declarada'),
    });
    await expect(correr('ver(x);')).rejects.toMatchObject({ tipo: 'nombre', linea: 1, columna: 5 });
  });

  it('el error de sintaxis ocurre antes de ejecutar nada', async () => {
    const salida: unknown[] = [];
    await expect(ejecutar('ver(1);\nint a = ;', hostDePrueba(salida)).terminado).rejects.toMatchObject({ tipo: 'sintaxis', linea: 2 });
    expect(salida).toEqual([]);
  });
});

describe('límites y control de ejecución', () => {
  it('un ciclo infinito agota el presupuesto de pasos', async () => {
    await expect(correr('while (true) { }', { maxPasos: 1000 })).rejects.toMatchObject({ tipo: 'limite', message: expect.stringContaining('1000') });
    await expect(correr('for (;;) ;', { maxPasos: 1000 })).rejects.toMatchObject({ tipo: 'limite' });
    await expect(correr('do { } while (true);', { maxPasos: 1000 })).rejects.toMatchObject({ tipo: 'limite' });
  });

  it('un programa largo pero finito sí termina con el límite por defecto', async () => {
    const r = await correr('int s = 0; for (int i = 0; i < 20000; i++) { s += i % 7; }');
    expect(r.estado).toBe('completado');
  });

  it('el límite es configurable', async () => {
    const codigo = 'for (int i = 0; i < 100; i++) { }';
    await expect(correr(codigo, { maxPasos: 50 })).rejects.toMatchObject({ tipo: 'limite' });
    await expect(correr(codigo, { maxPasos: 1000 })).resolves.toMatchObject({ estado: 'completado' });
  });

  it('la recursión infinita se corta por profundidad', async () => {
    await expect(correr('int f(int n) { return f(n + 1); } f(0);', { maxProfundidad: 50 })).rejects.toMatchObject({
      tipo: 'limite', message: expect.stringContaining('50'),
    });
  });

  it('cede el hilo cada cierto número de pasos', async () => {
    let cedidas = 0;
    await correr('for (int i = 0; i < 300; i++) { }', {
      pasosPorTanda: 100,
      cederControl: async () => void cedidas++,
    });
    expect(cedidas).toBeGreaterThanOrEqual(3);
  });

  it('se puede cancelar un programa en ejecución', async () => {
    const salida: unknown[] = [];
    let cedidas = 0;
    // La primera cesión ocurre antes de que `ej` exista; cancelamos en la segunda.
    const ej: Ejecucion = ejecutar('while (true) { ver(1); }', hostDePrueba(salida), {
      maxPasos: 1e9,
      pasosPorTanda: 10,
      cederControl: async () => { if (++cedidas === 2) ej.cancelar(); },
    });
    const r = await ej.terminado;
    expect(r.estado).toBe('cancelado');
    expect(salida.length).toBeLessThan(50);
  });
});

describe('acciones asíncronas (animaciones)', () => {
  it('espera a que cada acción termine antes de la siguiente', async () => {
    const eventos: string[] = [];
    const accion: FuncionHost = {
      nombre: 'accion',
      params: ['int'],
      retorno: 'void',
      // Las primeras acciones tardan más: si no se esperaran, terminarían desordenadas.
      fn: (n: number) =>
        new Promise<void>((resolver) => {
          eventos.push(`inicio ${n}`);
          setTimeout(() => { eventos.push(`fin ${n}`); resolver(); }, (4 - n) * 10);
        }),
    };
    await correr('for (int i = 1; i <= 3; i++) accion(i);', {}, [accion]);
    expect(eventos).toEqual(['inicio 1', 'fin 1', 'inicio 2', 'fin 2', 'inicio 3', 'fin 3']);
  });

  it('un valor de retorno de una función del juego se usa en expresiones', async () => {
    const dos: FuncionHost = { nombre: 'dos', params: [], retorno: 'int', fn: () => 2 };
    const { salida } = await correr('ver(dos() * 3);', {}, [dos]);
    expect(salida).toEqual([6]);
  });

  it('si la animación falla, el error llega con la posición de la llamada', async () => {
    const mala: FuncionHost = { nombre: 'mala', params: [], retorno: 'void', fn: () => Promise.reject(new Error('x')) };
    await expect(correr('\n  mala();', {}, [mala])).rejects.toMatchObject({ tipo: 'ejecucion', linea: 2, columna: 3 });
  });
});
