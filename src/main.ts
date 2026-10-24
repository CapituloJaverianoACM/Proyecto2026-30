import Phaser from "phaser";
import { ANCHO_JUEGO, ALTO_JUEGO } from "./EscenaMatriz";
import { EscenaNivel } from "./escenas/EscenaNivel";
import { Menu } from "./escenas/EscenaMenu";

// ===== Arranque: configuración del juego de Phaser =====
new Phaser.Game({
  type: Phaser.AUTO, // usa WebGL si está disponible; si no, canvas
  parent: "juego", // el <div id="juego"> del index.html
  width: ANCHO_JUEGO,
  height: ALTO_JUEGO,
  backgroundColor: "#ffffff",
  scene: [Menu, EscenaNivel], // las escenas que forman el juego
});
