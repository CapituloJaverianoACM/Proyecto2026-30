import Phaser from "phaser";
import { EscenaMatriz, ANCHO_JUEGO, ALTO_JUEGO } from "./EscenaMatriz";

// ===== Arranque: configuración del juego de Phaser =====
new Phaser.Game({
  type: Phaser.AUTO, // usa WebGL si está disponible; si no, canvas
  parent: "juego", // el <div id="juego"> del index.html
  width: ANCHO_JUEGO,
  height: ALTO_JUEGO,
  backgroundColor: "#ffffff",
  scene: [EscenaMatriz],
});
