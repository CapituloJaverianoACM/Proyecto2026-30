import Phaser from "phaser";
import { Partida } from "../modelo/Partida";
import { NIVELES } from "../niveles";

export const TAM_CELDA = 50; // píxeles

// ===== Vista + controles: una "escena" de Phaser =====
export class EscenaNivel extends Phaser.Scene {
    private partida!: Partida;
    private circulo!: Phaser.GameObjects.Arc;
    private circulosBasura = new Map<string, Phaser.GameObjects.Arc>();
    private info!: Phaser.GameObjects.Text;
    private moviendo = false; // evita mover otra vez mientras dura la animación

    constructor() {
        super("EscenaNivel");
    }

    // create() se ejecuta una sola vez al iniciar la escena
    create(): void {
        this.partida = new Partida(NIVELES[0]); // Cargar el primer nivel
        this.circulosBasura.clear();
        this.moviendo = false;


        // 1. Líneas de la cuadrícula
        const lineas = this.add.graphics();
        lineas.lineStyle(1, 0xcccccc);
        for (let c = 0; c <= this.partida.nivel.columnas; c++) {
            lineas.lineBetween(c * TAM_CELDA, 0, c * TAM_CELDA, this.partida.nivel.filas * TAM_CELDA);
        }
        for (let f = 0; f <= this.partida.nivel.filas; f++) {
            lineas.lineBetween(0, f * TAM_CELDA, this.partida.nivel.columnas * TAM_CELDA, f * TAM_CELDA);
        }

        // 2. Basura estática: cada círculo rojo ocupa una casilla hasta que la bola la pisa.
        for (const basura of this.partida.basuras) {
            const { x, y } = this.aPixeles(basura.fila, basura.col);
            const circuloBasura = this.add.circle(x, y, TAM_CELDA * 0.2, 0xe53935);
            this.circulosBasura.set(this.clave(basura.fila, basura.col), circuloBasura);
        }

        // 3. La bola (un círculo de Phaser que podemos mover y animar)
        const { x, y } = this.aPixeles(this.partida.bola.fila, this.partida.bola.col);
        this.circulo = this.add.circle(x, y, TAM_CELDA * 0.35, 0x2456c9);

        // 4. Texto con la posición
        this.info = this.add.text(8, this.partida.nivel.filas * TAM_CELDA + 10, "", {
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

        teclado.on("keydown-ESC", () => this.scene.start("Menu"));
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

        if (!this.partida.mover(df, dc)) {
            // Se iba a salir: sacudimos la cámara como aviso
            this.cameras.main.shake(120, 0.004);
            return;
        }

        // Animación suave hasta la nueva celda (un "tween")
        this.moviendo = true;
        const destino = this.aPixeles(this.partida.bola.fila, this.partida.bola.col);
        this.tweens.add({
            targets: this.circulo,
            x: destino.x,
            y: destino.y,
            duration: 120,
            ease: "Sine.easeInOut",
            onComplete: () => {
                this.eliminarBasuraEn(this.partida.bola.fila, this.partida.bola.col);
                this.moviendo = false;
            },
        });
        this.actualizarTexto();
    }

    private actualizarTexto(): void {
        this.info.setText(`Fila ${this.partida.bola.fila}, columna ${this.partida.bola.col}, basuras recogidas: ${this.partida.recogidas}`);
        if (this.partida.basuras.length === 0) {
            this.partida.terminado;
        }
    }

    private clave(fila: number, col: number): string {
        return `${fila},${col}`;
    }

    private eliminarBasuraEn(fila: number, col: number): void {
        const clave = this.clave(fila, col);
        const circulo = this.circulosBasura.get(clave);
        if (!circulo || !this.partida.recogerBasura(fila, col)) return;

        circulo.destroy();
        this.circulosBasura.delete(clave);
        this.actualizarTexto();
    }
}
