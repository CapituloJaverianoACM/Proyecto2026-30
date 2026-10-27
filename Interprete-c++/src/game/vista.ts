// Contrato entre el juego y cualquier vista (Phaser u otra). Es lo único que una vista
// debe implementar para conectarse al intérprete: no conoce el lenguaje ni el estado lógico.

import type { Accion, ConfigTablero } from './estado';

export interface VistaJuego {
  // Dibuja el tablero en su estado inicial.
  reiniciar(config: ConfigTablero): void;
  // Reproduce una acción ya validada; resuelve al terminar la animación.
  // El intérprete espera esa Promise antes de ejecutar la siguiente instrucción.
  animar(accion: Accion): Promise<void>;
}
