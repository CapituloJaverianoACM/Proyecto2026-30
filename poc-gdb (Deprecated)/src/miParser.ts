/*  
  Adaptador sobre la librería `gdb-mi-parser`, que hace el parseo del formato MI
  
  GDB responde una línea por registro. Ejemplos reales:

   5^done,variables=[{name="x",value="3"},{name="y",value="0"}]
   *stopped,reason="end-stepping-range",frame={line="8",func="main"}
   ~"texto de consola\n"
   (gdb)

  Prefijos: ^ resultado | * asíncrono | = notificación | ~ consola | @ programa | & log.
  El número delante del prefijo es el token que GDB repite para identificar el comando.
  La librería devuelve todos los valores como texto; aquí solo se convierte a nuestros tipos.
*/
import gdbMiParser from 'gdb-mi-parser';

export type MiValor = string | MiTupla | MiValor[];
export interface MiTupla {
  [clave: string]: MiValor;
}

export type TipoRegistro = 'result' | 'exec' | 'notify' | 'console' | 'target' | 'log';

export interface RegistroMi {
  tipo: TipoRegistro;
  token?: number;
  // done, running, error, stopped... (vacío en los streams)
  clase: string;
  // Pares clave=valor de la línea (vacío en los streams)
  datos: MiTupla;
  // Texto del stream (~ @ &)
  texto?: string;
}

export interface VariableMi {
  nombre: string;
  tipo?: string;
  valor?: string;
}

// lee una línea de GDB. Devuelve null para gdb, salida del programa o líneas malformadas
export function parsearLineaMi(linea: string): RegistroMi | null {
  let salida;
  try {
    salida = gdbMiParser(linea);
  } catch {
    return null;
  }

  // Cada línea produce a lo sumo un registro: o de resultado (^) o fuera de banda (* = ~ @ &).
  const crudo = salida.resultRecord ?? salida.outOfBandRecords[0];
  if (!crudo) return null;

  const tipo = crudo.outputType as TipoRegistro;
  const esStream = tipo === 'console' || tipo === 'target' || tipo === 'log';
  const resultado = crudo.result;

  return {
    tipo,
    token: crudo.token ? Number(crudo.token) : undefined,
    clase: esStream ? '' : crudo.class,
    datos: !esStream && resultado && typeof resultado === 'object' ? (resultado as MiTupla) : {},
    texto: esStream && typeof resultado === 'string' ? resultado : undefined,
  };
}

// Convierte `variables=[{name="x",value="5"},...]` en objetos tipados
export function aVariables(valor: MiValor | undefined): VariableMi[] {
  if (!Array.isArray(valor)) return [];
  const variables: VariableMi[] = [];
  for (const item of valor) {
    if (typeof item === 'object' && !Array.isArray(item) && typeof item.name === 'string') {
      variables.push({
        nombre: item.name,
        tipo: typeof item.type === 'string' ? item.type : undefined,
        valor: typeof item.value === 'string' ? item.value : undefined,
      });
    }
  }
  return variables;
}
