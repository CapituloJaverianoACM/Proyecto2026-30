import Phaser from 'phaser';
import type { Accion, Celda, ConfigTablero } from '../game/estado';
import type { VistaJuego } from '../game/vista';

export const TAM_CELDA = 64;

const MS_MOVER = 250;
const MS_GIRAR = 200;
const MS_RECOGER = 150;

// Vista del juego (implementa VistaJuego). Solo dibuja y anima: la lógica (límites,
// paredes, basura) vive en EstadoJuego. Recibe Acciones ya validadas.
export class EscenaJuego extends Phaser.Scene implements VistaJuego {
  private contenido!: Phaser.GameObjects.Container;
  private robot!: Phaser.GameObjects.Text;
  private basuras = new Map<string, Phaser.GameObjects.Arc>();
  private angulo = 0; // acumulado, así girar a la derecha siempre gira en el mismo sentido

  constructor(private config: ConfigTablero, private alListo: () => void) {
    super('EscenaJuego');
  }

  create(): void {
    this.contenido = this.add.container(0, 0);
    this.reiniciar(this.config);
    this.alListo();
  }

  // Redibuja el tablero en su estado inicial.
  reiniciar(config: ConfigTablero): void {
    this.contenido.removeAll(true);
    this.basuras.clear();
    const { filas, columnas } = config;

    const rejilla = this.add.graphics();
    rejilla.lineStyle(1, 0xcccccc);
    for (let c = 0; c <= columnas; c++) rejilla.lineBetween(c * TAM_CELDA, 0, c * TAM_CELDA, filas * TAM_CELDA);
    for (let f = 0; f <= filas; f++) rejilla.lineBetween(0, f * TAM_CELDA, columnas * TAM_CELDA, f * TAM_CELDA);
    this.contenido.add(rejilla);

    for (const p of config.paredes ?? []) {
      const { x, y } = this.centro(p);
      this.contenido.add(this.add.rectangle(x, y, TAM_CELDA - 4, TAM_CELDA - 4, 0x444444));
    }

    for (const b of config.basuras ?? []) {
      const { x, y } = this.centro(b);
      const circulo = this.add.circle(x, y, TAM_CELDA * 0.2, 0xe53935);
      this.basuras.set(`${b.fila},${b.col}`, circulo);
      this.contenido.add(circulo);
    }

    // El robot es un triángulo ▲ que apunta hacia arriba (dirección 0) y se rota.
    const { x, y } = this.centro(config.inicio);
    this.angulo = (config.dir ?? 1) * 90;
    this.robot = this.add.text(x, y, '▲', { fontFamily: 'sans-serif', fontSize: '44px', color: '#2456c9' });
    this.robot.setOrigin(0.5).setAngle(this.angulo);
    this.contenido.add(this.robot);
  }

  // Reproduce una acción ya validada. La Promise se resuelve cuando termina la animación;
  // el intérprete espera esa Promise antes de ejecutar la siguiente instrucción.
  animar(accion: Accion): Promise<void> {
    return new Promise((resolver) => {
      switch (accion.tipo) {
        case 'mover': {
          const { x, y } = this.centro(accion.a);
          this.tweens.add({ targets: this.robot, x, y, duration: MS_MOVER, ease: 'Sine.easeInOut', onComplete: () => resolver() });
          break;
        }
        case 'girar':
          this.angulo += accion.giro === 'derecha' ? 90 : -90;
          this.tweens.add({ targets: this.robot, angle: this.angulo, duration: MS_GIRAR, onComplete: () => resolver() });
          break;
        case 'recoger': {
          const clave = `${accion.en.fila},${accion.en.col}`;
          const basura = this.basuras.get(clave);
          if (!basura) return resolver();
          this.basuras.delete(clave);
          this.tweens.add({
            targets: basura, scale: 0, duration: MS_RECOGER,
            onComplete: () => { basura.destroy(); resolver(); },
          });
          break;
        }
      }
    });
  }

  private centro(c: Celda): { x: number; y: number } {
    return { x: c.col * TAM_CELDA + TAM_CELDA / 2, y: c.fila * TAM_CELDA + TAM_CELDA / 2 };
  }
}
