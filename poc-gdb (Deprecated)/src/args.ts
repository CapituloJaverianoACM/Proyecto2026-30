//Archivo para leer los argumentos de la línea de comandos y devolverlos en un objeto de opciones

// Indica el número máximo de pasos que se ejecutarán antes de detenerse para evitar problemas de bucles infinitos
export const MAX_PASOS_POR_DEFECTO = 10000;

export interface Opciones {
  // El nombre del archivo de c++
  archivo?: string;
  // Muestra también los pasos en los que x e y no cambian.
  verbose: boolean;
  // Límite de pasos para evitar bucles infinitos.
  maxPasos: number;
}

// Lee: <archivo.cpp> [--verbose] [--max-steps=N]
export function leerOpciones(argv: string[]): Opciones {
  let archivo: string | undefined;
  let verbose = false;
  let maxPasos = MAX_PASOS_POR_DEFECTO;

  for (const arg of argv) {
    if (arg === '--verbose') verbose = true;
    else if (arg.startsWith('--max-steps=')) maxPasos = Number(arg.slice('--max-steps='.length));
    else if (!arg.startsWith('--')) archivo = arg;
  }

  if (!Number.isInteger(maxPasos) || maxPasos <= 0) maxPasos = MAX_PASOS_POR_DEFECTO;
  return { archivo, verbose, maxPasos };
}
