// Estado lógico del juego. No importa Phaser: se puede probar sin navegador.
// Cada método valida la acción, cambia el estado y devuelve un evento (Accion)
// que luego la vista reproduce como animación.

import { ErrorJuego } from '../lang/errors';

export interface Celda {
  fila: number;
  col: number;
}

// 0 = arriba (norte), 1 = derecha (este), 2 = abajo (sur), 3 = izquierda (oeste)
export type Direccion = 0 | 1 | 2 | 3;
const DELTAS: ReadonlyArray<readonly [number, number]> = [[-1, 0], [0, 1], [1, 0], [0, -1]];

export type Accion =
  | { tipo: 'mover'; de: Celda; a: Celda }
  | { tipo: 'girar'; giro: 'derecha' | 'izquierda'; dir: Direccion }
  | { tipo: 'recoger'; en: Celda };

export interface ConfigTablero {
  filas: number;
  columnas: number;
  inicio: Celda;
  dir?: Direccion;
  basuras?: Celda[];
  paredes?: Celda[];
}

const clave = (c: Celda) => `${c.fila},${c.col}`;

export class EstadoJuego {
  readonly filas: number;
  readonly columnas: number;
  pos: Celda;
  dir: Direccion;
  readonly paredes: Set<string>;
  readonly basuras: Set<string>;
  recogidas = 0;

  constructor(config: ConfigTablero) {
    this.filas = config.filas;
    this.columnas = config.columnas;
    this.pos = { ...config.inicio };
    this.dir = config.dir ?? 1;
    this.paredes = new Set((config.paredes ?? []).map(clave));
    this.basuras = new Set((config.basuras ?? []).map(clave));
  }

  private frente(): Celda {
    const [df, dc] = DELTAS[this.dir]!;
    return { fila: this.pos.fila + df, col: this.pos.col + dc };
  }

  private fueraDelTablero(c: Celda): boolean {
    return c.fila < 0 || c.fila >= this.filas || c.col < 0 || c.col >= this.columnas;
  }

  // Sensores: no cambian el estado.
  hayPared(): boolean {
    const f = this.frente();
    return this.fueraDelTablero(f) || this.paredes.has(clave(f));
  }

  hayBasura(): boolean {
    return this.basuras.has(clave(this.pos));
  }

  // Acciones: validan, cambian el estado y devuelven el evento para la vista.
  avanzar(): Accion {
    const destino = this.frente();
    if (this.fueraDelTablero(destino)) {
      throw new ErrorJuego('No puedes avanzar: te saldrías del tablero');
    }
    if (this.paredes.has(clave(destino))) {
      throw new ErrorJuego(`No puedes avanzar: hay una pared en la fila ${destino.fila}, columna ${destino.col}`);
    }
    const de = this.pos;
    this.pos = destino;
    return { tipo: 'mover', de, a: destino };
  }

  girarDerecha(): Accion {
    this.dir = ((this.dir + 1) % 4) as Direccion;
    return { tipo: 'girar', giro: 'derecha', dir: this.dir };
  }

  girarIzquierda(): Accion {
    this.dir = ((this.dir + 3) % 4) as Direccion;
    return { tipo: 'girar', giro: 'izquierda', dir: this.dir };
  }

  recogerBasura(): Accion {
    if (!this.basuras.delete(clave(this.pos))) {
      throw new ErrorJuego(`No hay basura en la fila ${this.pos.fila}, columna ${this.pos.col}`);
    }
    this.recogidas++;
    return { tipo: 'recoger', en: { ...this.pos } };
  }
}
