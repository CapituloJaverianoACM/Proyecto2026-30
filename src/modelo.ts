// ===== Modelo: la lógica del juego, sin nada de Phaser =====
// Este archivo es idéntico en espíritu al de la versión con canvas.

export const FILAS = 10;
export const COLUMNAS = 10;
export let Basurasrecogidas = 0;

export interface Posicion {
  fila: number;
  col: number;
}

export const bola: Posicion = { fila: 0, col: 0 };

// Basura ubicada en casillas fijas de la matriz.
export const basuras: Posicion[] = [
  { fila: 1, col: 3 },
  { fila: 2, col: 7 },
  { fila: 4, col: 1 },
  { fila: 4, col: 5 },
  { fila: 6, col: 8 },
  { fila: 7, col: 3 },
  { fila: 8, col: 6 },
  { fila: 9, col: 9 },
];

// Intenta mover la bola; devuelve true si se movió, false si se iba a salir
export function mover(df: number, dc: number): boolean {
  const nuevaFila = bola.fila + df;
  const nuevaCol = bola.col + dc;
  const dentro =
    nuevaFila >= 0 && nuevaFila < FILAS && nuevaCol >= 0 && nuevaCol < COLUMNAS;
  if (dentro) {
    bola.fila = nuevaFila;
    bola.col = nuevaCol;
  }
  return dentro;
}

// Retira la basura de la casilla alcanzada, si había alguna.
export function recogerBasura(fila: number, col: number): boolean {
  const indice = basuras.findIndex((basura) => basura.fila === fila && basura.col === col);
  if (indice === -1) return false;

  basuras.splice(indice, 1);
  Basurasrecogidas++;
  return true;
}
