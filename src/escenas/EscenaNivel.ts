import Phaser from "phaser";
import { Partida } from "../modelo/Partida";
import { NIVELES } from "../niveles";
import { TAM_TABLERO } from "../config";
import { mostrarPanel, escribiendoCodigo } from "../code/panel";

// ===== Vista + controles: una "escena" de Phaser =====
export class EscenaNivel extends Phaser.Scene {
    private partida!: Partida;
    private circulo!: Phaser.GameObjects.Arc;
    private circulosBasura = new Map<string, Phaser.GameObjects.Arc>();
    private info!: Phaser.GameObjects.Text;
    private moviendo = false; // evita mover otra vez mientras dura la animación
    private indiceNivel = 0; // índice del nivel actual
    private tam = 0;      // tamaño de celda de ESTE nivel, en píxeles
    private origenX = 0;  // dónde empieza el tablero (esquina superior izquierda)
    private origenY = 0;


    constructor() {
        super("EscenaNivel");
    }

    // create() se ejecuta una sola vez al iniciar la escena
    create(): void {
        this.partida = new Partida(NIVELES[this.indiceNivel]); // Cargar el primer nivel
        //muestra el panel
        mostrarPanel(this.partida.nivel, this.indiceNivel + 1);
        this.circulosBasura.clear();
        this.moviendo = false;

        const { filas, columnas } = this.partida.nivel;
        this.tam = Math.floor(TAM_TABLERO / Math.max(filas, columnas));
        this.origenX = (TAM_TABLERO - columnas * this.tam) / 2;
        this.origenY = (TAM_TABLERO - filas * this.tam) / 2;

        
        // 1. Líneas de la cuadrícula
        const lineas = this.add.graphics();
        lineas.lineStyle(1, 0xcccccc);



        const ancho = columnas * this.tam;
        const alto = filas * this.tam;
        for (let c = 0; c <= columnas; c++) {
            const x = this.origenX + c * this.tam;
            lineas.lineBetween(x, this.origenY, x, this.origenY + alto);
        }
        for (let f = 0; f <= filas; f++) {
            const y = this.origenY + f * this.tam;
            lineas.lineBetween(this.origenX, y, this.origenX + ancho, y);
        }


        // 2. Basura estática: cada círculo rojo ocupa una casilla hasta que la bola la pisa.
        for (const basura of this.partida.basuras) {
            const { x, y } = this.aPixeles(basura.fila, basura.col);
            const circuloBasura = this.add.circle(x, y, this.tam * 0.2, 0xe53935);
            this.circulosBasura.set(this.clave(basura.fila, basura.col), circuloBasura);
        }

        // 3. La bola (un círculo de Phaser que podemos mover y animar)
        const { x, y } = this.aPixeles(this.partida.bola.fila, this.partida.bola.col);
        this.circulo = this.add.circle(x, y, this.tam * 0.35, 0x2456c9);

        // 4. Texto con la posición
        this.info = this.add.text(8, TAM_TABLERO + 10, "", {
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

        teclado.on("keydown-ESC", () => {
            if(!escribiendoCodigo()) this.scene.start("Menu");
        })
    }

    // Convierte una posición de la matriz al centro de la celda en píxeles
    private aPixeles(fila: number, col: number): { x: number; y: number } {
        return {
            x: this.origenX + col * this.tam + this.tam / 2,
            y: this.origenY + fila * this.tam + this.tam / 2,
        };

    }

    private intentarMover(df: number, dc: number): void {
        if (this.moviendo || escribiendoCodigo()) return;

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
        if (this.partida.terminado) {
            this.info.setText(`¡Felicidades! Has recogido toda la basura.`);
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

        if (this.partida.terminado) {
            this.moviendo = true; // truco: bloquea las flechas mientras esperamos
            this.time.delayedCall(1500, () => {
                const siguiente = this.indiceNivel + 1;
                if (siguiente < NIVELES.length) {
                    this.scene.start("EscenaNivel", { indice: siguiente });
                } else {
                    this.scene.start("Menu");
                }
            });
        }


    }


    init(data: { indice?: number }): void {
        this.indiceNivel = data.indice ?? 0;
    }
}
