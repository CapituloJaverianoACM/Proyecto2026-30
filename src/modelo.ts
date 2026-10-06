// ===== Modelo: la lógica del juego, sin nada de Phaser =====
// Este archivo es idéntico en espíritu al de la versión con canvas.

export const FILAS = 10;
export const COLUMNAS = 10;

export interface Posicion {
  fila: number;
  col: number;
}

export const bola: Posicion = { fila: 0, col: 0 };

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
