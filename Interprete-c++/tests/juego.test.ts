import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crearApiJuego } from '../src/game/api';
import { EstadoJuego, type Accion, type ConfigTablero } from '../src/game/estado';
import { ejecutar } from '../src/lang';
import { correr } from './util';

const TABLERO: ConfigTablero = { filas: 8, columnas: 8, inicio: { fila: 0, col: 0 }, dir: 1 };

// Corre código del estudiante contra un juego real (sin Phaser) y registra las acciones en orden.
async function jugar(codigo: string, config: ConfigTablero = TABLERO) {
  const estado = new EstadoJuego(config);
  const acciones: Accion[] = [];
  // Cada acción "se anima" 1 ms, como haría una vista real.
  const api = crearApiJuego(estado, (a) => new Promise<void>((r) => { acciones.push(a); setTimeout(r, 1); }));
  await ejecutar(codigo, api).terminado;
  return { estado, acciones, resumen: acciones.map((a) => (a.tipo === 'mover' ? 'mover' : a.tipo === 'girar' ? `girar-${a.giro}` : 'recoger')) };
}

describe('GameApi: ejemplos del enunciado', () => {
  it('for + if + while ejecutan las acciones en el orden correcto', async () => {
    const { resumen, estado } = await jugar(`
      int pasos = 3;
      for (int i = 0; i < pasos; i++) { avanzar(); }
      if (pasos > 2) { girarDerecha(); }
      int contador = 0;
      while (contador < 2) { avanzar(); contador++; }
    `);
    expect(resumen).toEqual(['mover', 'mover', 'mover', 'girar-derecha', 'mover', 'mover']);
    expect(estado.pos).toEqual({ fila: 2, col: 3 }); // 3 al este, giro al sur, 2 al sur
    expect(estado.dir).toBe(2);
  });

  it('la acción depende de la condición real, no de una secuencia fija', async () => {
    const programa = (energia: number) => `
      int energia = ${energia};
      if (energia > 3) { avanzar(); } else { girarIzquierda(); }
    `;
    expect((await jugar(programa(5))).resumen).toEqual(['mover']);
    expect((await jugar(programa(1))).resumen).toEqual(['girar-izquierda']);
  });
});

describe('GameApi: varias soluciones válidas al mismo reto', () => {
  // Reto: llegar a la fila 3, columna 4 (4 al este, giro, 3 al sur).
  const meta = { fila: 3, col: 4 };
  const soluciones: Record<string, string> = {
    'for': 'for (int i = 0; i < 4; i++) avanzar(); girarDerecha(); for (int j = 0; j < 3; j++) avanzar();',
    'while': 'int i = 0; while (i < 4) { avanzar(); i++; } girarDerecha(); int j = 3; while (j > 0) { avanzar(); j--; }',
    'do-while': 'int i = 0; do { avanzar(); i++; } while (i < 4); girarDerecha(); i = 0; do { avanzar(); i++; } while (i < 3);',
    'función propia': 'void caminar(int n) { for (int k = 0; k < n; k++) avanzar(); } caminar(4); girarDerecha(); caminar(3);',
    'recursión': 'void caminar(int n) { if (n == 0) return; avanzar(); caminar(n - 1); } caminar(4); girarDerecha(); caminar(3);',
    'ciclos anidados': 'for (int tramo = 0; tramo < 2; tramo++) { int largo = 4 - tramo; for (int p = 0; p < largo; p++) avanzar(); girarDerecha(); }',
  };

  for (const [nombre, codigo] of Object.entries(soluciones)) {
    it(`solución con ${nombre}`, async () => {
      const { estado } = await jugar(codigo);
      expect(estado.pos).toEqual(meta);
    });
  }

  it('solución con sensor: avanzar hasta la pared', async () => {
    const { estado } = await jugar('while (!hayPared()) avanzar();');
    expect(estado.pos).toEqual({ fila: 0, col: 7 });
  });

});

describe('GameApi: validación de acciones', () => {
  it('no se puede salir del tablero', async () => {
    await expect(jugar('girarIzquierda(); avanzar();')).rejects.toMatchObject({
      tipo: 'juego', linea: 1, columna: 19, message: expect.stringContaining('saldrías del tablero'),
    });
  });

  it('no se puede atravesar una pared', async () => {
    const conPared = { ...TABLERO, paredes: [{ fila: 0, col: 2 }] };
    await expect(jugar('avanzar();\navanzar();', conPared)).rejects.toMatchObject({
      tipo: 'juego', linea: 2, message: expect.stringContaining('pared en la fila 0, columna 2'),
    });
  });

  it('el programa se detiene en la acción inválida y deja el estado válido', async () => {
    const estado = new EstadoJuego({ ...TABLERO, paredes: [{ fila: 0, col: 2 }] });
    const api = crearApiJuego(estado, () => {});
    await expect(ejecutar('avanzar(); avanzar(); avanzar();', api).terminado).rejects.toMatchObject({ tipo: 'juego' });
    expect(estado.pos).toEqual({ fila: 0, col: 1 });
  });

  it('recoger basura: solo donde hay', async () => {
    const config = { ...TABLERO, basuras: [{ fila: 0, col: 1 }] };
    const { estado, resumen } = await jugar('avanzar(); if (hayBasura()) recogerBasura();', config);
    expect(resumen).toEqual(['mover', 'recoger']);
    expect(estado.recogidas).toBe(1);
    expect(estado.hayBasura()).toBe(false);
    await expect(jugar('recogerBasura();')).rejects.toMatchObject({ tipo: 'juego', message: expect.stringContaining('No hay basura') });
  });

  it('el estudiante solo ve las funciones de la API', async () => {
    await expect(jugar('estado = 1;')).rejects.toMatchObject({ tipo: 'nombre' });
    await expect(jugar('estado.pos = 1;')).rejects.toMatchObject({ tipo: 'lexico' }); // no existe el operador "."
    await expect(jugar('window.alert(1);')).rejects.toMatchObject({ tipo: 'lexico' });
    await expect(jugar('fetch("x");')).rejects.toMatchObject({ tipo: 'funcion' });
    await expect(jugar('eval("avanzar()");')).rejects.toMatchObject({ tipo: 'funcion' });
  });

  it('girar cuatro veces vuelve a la dirección original', async () => {
    const { estado } = await jugar('for (int i = 0; i < 4; i++) girarDerecha();');
    expect(estado.dir).toBe(1);
  });
});

describe('compatibilidad con el PoC de GDB (poc-gdb/ejemplo.cpp)', () => {
  it('el mismo programa C++ da la misma posición final que con g++/gdb', async () => {
    const original = readFileSync(new URL('../../poc-gdb/ejemplo.cpp', import.meta.url), 'utf8');
    // Se reemplaza el std::cout (no soportado) por una llamada que reporta x e y.
    const codigo = original.replace(/std::cout.*;/, 'ver2(x, y);');
    expect(codigo).toContain('ver2(x, y);');

    const { salida } = await correr(codigo);
    // El PoC documenta este recorrido: 7 derecha, 10 abajo, 7 izquierda, 10 arriba, +2 y +1.
    expect(salida).toEqual([[2, 1]]);
  });
});
