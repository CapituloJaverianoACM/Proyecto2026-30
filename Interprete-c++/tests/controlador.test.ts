import { describe, expect, it } from 'vitest';
import { ControladorJuego } from '../src/game';
import type { Accion, ConfigTablero } from '../src/game/estado';
import type { VistaJuego } from '../src/game/vista';

const config: ConfigTablero = { filas: 3, columnas: 3, inicio: { fila: 0, col: 0 }, dir: 1, basuras: [{ fila: 0, col: 1 }] };

class VistaFalsa implements VistaJuego {
  acciones: Accion[] = [];
  reinicios = 0;
  reiniciar(): void { this.reinicios++; }
  animar(a: Accion): Promise<void> {
    this.acciones.push(a);
    return new Promise((r) => setTimeout(r, 1));
  }
}

describe('ControladorJuego', () => {
  it('reinicia la vista y anima las acciones en orden', async () => {
    const vista = new VistaFalsa();
    const juego = new ControladorJuego(vista, config);
    const r = await juego.ejecutar('avanzar(); recogerBasura();').terminado;
    expect(r.estado).toBe('completado');
    expect(vista.reinicios).toBe(1);
    expect(vista.acciones.map((a) => a.tipo)).toEqual(['mover', 'recoger']);
    expect(juego.estado.recogidas).toBe(1);
  });

  it('error de juego llega con posición y no anima la acción inválida', async () => {
    const vista = new VistaFalsa();
    const juego = new ControladorJuego(vista, config);
    await expect(juego.ejecutar('girarIzquierda();\navanzar();').terminado).rejects.toMatchObject({ tipo: 'juego', linea: 2 });
    expect(vista.acciones).toHaveLength(1);
  });

  it('cancelar detiene la ejecución', async () => {
    const juego = new ControladorJuego(new VistaFalsa(), config);
    const e = juego.ejecutar('while (true) { girarDerecha(); }');
    e.cancelar();
    expect((await e.terminado).estado).toBe('cancelado');
  });
});
