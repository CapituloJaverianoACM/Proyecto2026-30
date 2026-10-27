// gdb-mi-parser no trae tipos: se declara solo lo que usamos.
// crea una interfaz para la salida cruda de gdb, y una función parse que recibe una línea y devuelve la salida cruda.

declare module 'gdb-mi-parser' {
  interface RegistroCrudo {
    // Número como texto, o "" si la línea no lo trae
    token: string;
    recordType: 'result' | 'async' | 'stream';
    outputType: 'result' | 'exec' | 'notify' | 'console' | 'target' | 'log' | 'status';
    class: string;
    // Tupla con los pares clave=valor, o el texto en los streams
    result?: unknown;
  }

  // Representa la salida cruda de gdb
  interface SalidaCruda {
    hasTerminator: boolean;
    outOfBandRecords: RegistroCrudo[];
    resultRecord?: RegistroCrudo;
  }
  function parse(linea: string): SalidaCruda;
  export = parse;
}
