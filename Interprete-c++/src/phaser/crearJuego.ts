import Phaser from 'phaser';
import type { ConfigTablero } from '../game/estado';
import type { VistaJuego } from '../game/vista';
import { EscenaJuego, TAM_CELDA } from './EscenaJuego';

// Crea el juego Phaser dentro de `parent` y devuelve la vista cuando la escena está lista.
export function crearJuegoPhaser(parent: string, config: ConfigTablero): Promise<VistaJuego> {
  return new Promise((resolver) => {
    const escena: EscenaJuego = new EscenaJuego(config, () => resolver(escena));
    new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: config.columnas * TAM_CELDA,
      height: config.filas * TAM_CELDA,
      backgroundColor: '#ffffff',
      scene: escena,
    });
  });
}
