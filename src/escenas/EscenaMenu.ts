import Phaser from "phaser";
import { ANCHO_JUEGO, ALTO_JUEGO, TAM_CELDA } from "../EscenaMatriz";

export class Menu extends Phaser.Scene {
    constructor() {
        super("Menu");
    }

    create(): void {
        const centroX = ANCHO_JUEGO / 2;

        // 1. Fondo oscuro + cuadrícula suave que recuerda al tablero del juego
        this.add.rectangle(0, 0, ANCHO_JUEGO, ALTO_JUEGO, 0xffffff).setOrigin(0);
        const cuadricula = this.add.graphics();
        cuadricula.lineStyle(1, 0x2456c9, 0.06);
        for (let x = 0; x <= ANCHO_JUEGO; x += TAM_CELDA) cuadricula.lineBetween(x, 0, x, ALTO_JUEGO);
        for (let y = 0; y <= ALTO_JUEGO; y += TAM_CELDA) cuadricula.lineBetween(0, y, ANCHO_JUEGO, y);

        // 2. Basuritas decorativas que flotan de arriba a abajo
        for (let i = 0; i < 8; i++) {
            const basura = this.add.circle(
                Phaser.Math.Between(20, ANCHO_JUEGO - 20),
                Phaser.Math.Between(20, ALTO_JUEGO - 20),
                Phaser.Math.Between(6, 12),
                0xe53935,
                0.35,
            );
            this.tweens.add({
                targets: basura,
                y: basura.y - 20,
                duration: Phaser.Math.Between(1500, 3000),
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
        }

        // 3. Título con borde y sombra, que "respira" suavemente
        const titulo = this.add.text(centroX, 130, "RECOGE LA\nBASURITA PUJ", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "40px",
            fontStyle: "bold",
            color: "#ffffff",
            align: "center",
            stroke: "#2456c9",
            strokeThickness: 6,
        }).setOrigin(0.5);
        this.tweens.add({ targets: titulo, y: 140, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

        // 4. La bola azul del juego como "personaje" del menú
        this.add.circle(centroX, 245, TAM_CELDA * 0.35, 0x2456c9).setStrokeStyle(3, 0xffffff);

        // 5. Botón: rectángulo redondeado + texto, agrupados en un contenedor
        const fondoBoton = this.add.graphics();
        fondoBoton.fillStyle(0x43a047);
        fondoBoton.fillRoundedRect(-90, -28, 180, 56, 16);
        const textoBoton = this.add.text(0, 0, "JUGAR", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "26px",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5);
        const boton = this.add.container(centroX, 345, [fondoBoton, textoBoton])
            .setSize(180, 56)
            .setInteractive({ useHandCursor: true });

        boton.on("pointerover", () => this.tweens.add({ targets: boton, scale: 1.1, duration: 100 }));
        boton.on("pointerout", () => this.tweens.add({ targets: boton, scale: 1, duration: 100 }));
        boton.on("pointerdown", () => empezar());

        // 7. Transición: aparece con fundido y se va con fundido a negro
        this.cameras.main.fadeIn(400);
        let saliendo = false; // evita que clic + ENTER arranquen el juego dos veces
        const empezar = () => {
            if (saliendo) return;
            saliendo = true;
            this.cameras.main.fadeOut(300);
            this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("EscenaNivel"));
        };
        this.input.keyboard!.once("keydown-ENTER", () => empezar());
    }
}
