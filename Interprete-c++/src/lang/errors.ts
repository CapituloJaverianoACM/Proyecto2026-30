// Errores del lenguaje. Todos llevan línea y columna del código del estudiante.

export type TipoError =
  | 'lexico'
  | 'sintaxis'
  | 'nombre' // variable no declarada o repetida
  | 'tipo' // conversión u operación inválida entre tipos
  | 'ejecucion' // división entre cero, función sin return, etc.
  | 'funcion' // función inexistente o con argumentos incorrectos
  | 'juego' // acción inválida del juego (pared, fuera del tablero)
  | 'limite'; // presupuesto de ejecución agotado

const ETIQUETAS: Record<TipoError, string> = {
  lexico: 'Error léxico',
  sintaxis: 'Error de sintaxis',
  nombre: 'Error de nombre',
  tipo: 'Error de tipos',
  ejecucion: 'Error de ejecución',
  funcion: 'Error de función',
  juego: 'Acción inválida',
  limite: 'Límite de ejecución',
};

export class ErrorLenguaje extends Error {
  constructor(
    readonly tipo: TipoError,
    mensaje: string,
    readonly linea: number,
    readonly columna: number,
  ) {
    super(mensaje);
    this.name = 'ErrorLenguaje';
  }
}

// Lo lanzan las funciones del juego (GameApi). El intérprete lo convierte en
// ErrorLenguaje de tipo 'juego' agregando la posición de la llamada.
export class ErrorJuego extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorJuego';
  }
}

// Mensaje listo para mostrar al estudiante.
export function formatearError(e: unknown): string {
  if (e instanceof ErrorLenguaje) {
    return `${ETIQUETAS[e.tipo]} (línea ${e.linea}, columna ${e.columna}): ${e.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}
