import Phaser from "phaser";
import { FILAS, COLUMNAS, bola, mover } from "./modelo";

export const TAM_CELDA = 50; // píxeles
const ALTO_TEXTO = 40; // espacio debajo de la matriz para el texto

// ===== Vista + controles: una "escena" de Phaser =====
export class EscenaMatriz extends Phaser.Scene {
  private circulo!: Phaser.GameObjects.Arc;
  private info!: Phaser.GameObjects.Text;
  private moviendo = false; // evita mover otra vez mientras dura la animación

  constructor() {
    super("EscenaMatriz");
  }

  // create() se ejecuta una sola vez al iniciar la escena
  create(): void {
    // 1. Líneas de la cuadrícula
    const lineas = this.add.graphics();
    lineas.lineStyle(1, 0xcccccc);
    for (let c = 0; c <= COLUMNAS; c++) {
      lineas.lineBetween(c * TAM_CELDA, 0, c * TAM_CELDA, FILAS * TAM_CELDA);
    }
    for (let f = 0; f <= FILAS; f++) {
      lineas.lineBetween(0, f * TAM_CELDA, COLUMNAS * TAM_CELDA, f * TAM_CELDA);
    }

    // 2. La bola (un círculo de Phaser que podemos mover y animar)
    const { x, y } = this.aPixeles(bola.fila, bola.col);
    this.circulo = this.add.circle(x, y, TAM_CELDA * 0.35, 0x2456c9);

    // 3. Texto con la posición
    this.info = this.add.text(8, FILAS * TAM_CELDA + 10, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#333333",
    });
    this.actualizarTexto();

    // 4. Controles: Phaser nos da eventos por cada flecha
    const teclado = this.input.keyboard!;
    teclado.on("keydown-UP", () => this.intentarMover(-1, 0));
    teclado.on("keydown-DOWN", () => this.intentarMover(1, 0));
    teclado.on("keydown-LEFT", () => this.intentarMover(0, -1));
    teclado.on("keydown-RIGHT", () => this.intentarMover(0, 1));
  }

  // Convierte una posición de la matriz al centro de la celda en píxeles
  private aPixeles(fila: number, col: number): { x: number; y: number } {
    return {
      x: col * TAM_CELDA + TAM_CELDA / 2,
      y: fila * TAM_CELDA + TAM_CELDA / 2,
    };
  }

  private intentarMover(df: number, dc: number): void {
    if (this.moviendo) return;

    if (!mover(df, dc)) {
      // Se iba a salir: sacudimos la cámara como aviso
      this.cameras.main.shake(120, 0.004);
      return;
    }

    // Animación suave hasta la nueva celda (un "tween")
    this.moviendo = true;
    const destino = this.aPixeles(bola.fila, bola.col);
    this.tweens.add({
      targets: this.circulo,
      x: destino.x,
      y: destino.y,
      duration: 120,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.moviendo = false;
      },
    });
    this.actualizarTexto();
  }

  private actualizarTexto(): void {
    this.info.setText(`Fila ${bola.fila}, columna ${bola.col}`);
  }
}

export const ANCHO_JUEGO = COLUMNAS * TAM_CELDA;
export const ALTO_JUEGO = FILAS * TAM_CELDA + ALTO_TEXTO;
