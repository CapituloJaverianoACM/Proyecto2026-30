// Único punto de unión entre el intérprete y la vista del juego.
// Posee el estado lógico, expone la API al lenguaje y reenvía las acciones a la vista.

import { ejecutar, type Ejecucion, type OpcionesEjecucion } from '../lang';
import { crearApiJuego } from './api';
import { EstadoJuego, type ConfigTablero } from './estado';
import type { VistaJuego } from './vista';

export class ControladorJuego {
  private _estado: EstadoJuego;

  constructor(private vista: VistaJuego, private config: ConfigTablero) {
    this._estado = new EstadoJuego(config);
  }

  get estado(): EstadoJuego {
    return this._estado;
  }

  // Vuelve al estado inicial del nivel, en lógica y en pantalla.
  reiniciar(): void {
    this._estado = new EstadoJuego(this.config);
    this.vista.reiniciar(this.config);
  }

  // Reinicia el tablero y ejecuta el código del estudiante contra él.
  ejecutar(codigo: string, opciones?: OpcionesEjecucion): Ejecucion {
    this.reiniciar();
    const api = crearApiJuego(this._estado, (accion) => this.vista.animar(accion));
    return ejecutar(codigo, api, opciones);
  }
}
