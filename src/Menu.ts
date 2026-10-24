import Phaser from "phaser";
import { ANCHO_JUEGO, ALTO_JUEGO } from "./EscenaMatriz"

export class Menu extends Phaser.Scene {
    constructor() {
        super("Menu");
    }


    create(): void {
        // Fondo del menú
        this.add.text(ANCHO_JUEGO / 2, 120, "RECOGE LA BASURITA PUJ");


        const botonJugar = this.add.text(ANCHO_JUEGO / 2, ALTO_JUEGO / 2, "JUGAR", {
            fontSize: "24px", color: "#333333", backgroundColor: "#2456c9",
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        botonJugar.on("pointerdown", () => this.scene.start("EscenaMatriz"));
        botonJugar.on("pointerover", () => botonJugar.setStyle({ backgroundColor: "#1a3e8c" }));
        botonJugar.on("pointerout", () => botonJugar.setStyle({ backgroundColor: "#2456c9" }));

        this.input.keyboard!.once("keydown-ENTER", () => this.scene.start("EscenaMatriz"));
    }
}