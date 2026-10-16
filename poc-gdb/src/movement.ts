// false => y crece para arriba. True => y crece para abajo.
export const Y_AXIS_INVERTED = false;

// DTO para representar una posición en el plano 
export interface Posicion {
  x: number;
  y: number;
}

// Devuelve la dirección ("derecha", "arriba y izquierda" y otras) o null si no hubo cambio.
export function detectarMovimiento(prev: Posicion, curr: Posicion): string | null {
  const parts: string[] = [];
  if (curr.x > prev.x) parts.push('derecha');
  else if (curr.x < prev.x) parts.push('izquierda');

  if (curr.y !== prev.y) {
    const increased = curr.y > prev.y;
    parts.push(increased === Y_AXIS_INVERTED ? 'abajo' : 'arriba');
  }
  return parts.length ? parts.join(' y ') : null;
}
