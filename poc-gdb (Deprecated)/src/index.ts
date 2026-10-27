// PoC: depura un .cpp con GDB/MI y muestra hacia dónde se mueven x e y.
// Uso: npx tsx src/index.ts <archivo.cpp> [--verbose] [--max-steps=N]

import * as fs from 'node:fs';
import * as path from 'node:path';
import { leerOpciones } from './args.js';
import { ResultadoCompilacion, compilar, variablesFaltantes } from './compiler.js';
import { GdbClient, type Parada } from './gdbClient.js';
import { detectarMovimiento, type Posicion } from './movement.js';

//Indica maximo de tiempo que se espera a GDB para responder, si lo excede se mata
const TIMEOUT_GDB_MS = 5000;

// Permite omitir errores en el stdout, asi si otro proceso molesta, no detiene la ejecución de este
process.stdout.on('error', () => {});

// Lee x e y como enteros; null si no están en el frame o aún no son números.
function leerPosicion(variables: { nombre: string; valor?: string }[]): Posicion | null {
  const leer = (nombre: string) => {
    const valor = variables.find((v) => v.nombre === nombre)?.valor;
    //revisa que el valor sea un número entero, sino devuelve null
    return valor !== undefined && /^-?\d+$/.test(valor) ? Number(valor) : null;
  };

  // lee las variables x e y, también se puede expandir a más variables a futuro
  const x = leer('x');
  const y = leer('y');
  return x === null || y === null ? null : { x, y };
}

// Comprueba el argumento y que el archivo exista. Devuelve la ruta absoluta o null
function validarEntrada(archivo: string | undefined): string | null {
  if (!archivo) {
    console.error('Uso: npx tsx src/index.ts <archivo.cpp> [--verbose] [--max-steps=N]');
    return null;
  }
  if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) {
    console.error(`Error: el archivo no existe: ${archivo}`);
    return null;
  }
  return path.resolve(archivo);
}

// comprueba si la parada es el fin del programa, devuelve el mensaje para mostrar; si no, null.
function mensajeDeFin(parada: Parada): string | null {
  if (parada.motivo === 'exited-normally' || parada.motivo === 'exited') {
    return `Programa terminado${parada.codigoSalida ? ` (código ${parada.codigoSalida})` : ''}`;
  }
  if (parada.motivo === 'signal-received' || parada.motivo === 'exited-signalled') {
    return `Programa detenido por señal (${parada.motivo})`;
  }
  return null;
}

// Ejecuta paso a paso y compara x e y entre pasos consecutivos.
async function recorrerPrograma(gdb: GdbClient, verbose: boolean, maxPasos: number): Promise<void> {
  //Manda lo que salga u entre al programa a /dev/null, para que no se vea en la consola
  await gdb.send('-inferior-tty-set /dev/null');
  // Se añade el breakpoint en main
  await gdb.send('-break-insert main');
  // Inicia el programa
  let parada = await gdb.exec('-exec-run');

  // Permite que la variable sea posición o null
  let anterior: Posicion | null = null;
  let paso = 0;

  // Bucle infinito (se podia haber hecho un while pero aja)
  for (;;) {
    // Si el programa terminó, se muestra el mensaje y termina
    const fin = mensajeDeFin(parada);
    // Si no, se continúa con el siguiente paso
    if (fin) {
      console.log(fin);
      return;
    }

    // Si se superó el límite de pasos, se acaba
    if (++paso > maxPasos) {
      console.log(`Límite de ${maxPasos} pasos alcanzado`);
      return;
    }


    // La primera parada (entrada a main) tiene x/y sin inicializar (osea tiene datos basura), entonces se omiten
    if (parada.conFuente && paso > 1) {
      const actual = leerPosicion(await gdb.listarVariables());
      if (actual) {
        if (anterior) mostrarMovimiento(parada.linea, anterior, actual, verbose);
        anterior = actual;
      }
    }

    // Sigue con el siguiente paso si hay código fuente, si hay un salto a código sin fuente, se hace un continue
    parada = await gdb.exec(parada.conFuente ? '-exec-next' : '-exec-continue');
  }
}

// Muestra el movimiento de x e y entre dos posiciones, si hay cambio o si verbose=true
function mostrarMovimiento(linea: number | undefined, antes: Posicion, ahora: Posicion, verbose: boolean): void {
  const direccion = detectarMovimiento(antes, ahora);
  if (!direccion && !verbose) return;

  const detalle = `[línea ${linea}] x: ${antes.x} -> ${ahora.x}, y: ${antes.y} -> ${ahora.y}`;
  console.log(`${detalle} | ${direccion ? `Dirección: ${direccion}` : 'sin cambio'}`);
}

async function main(): Promise<number> {
  const { archivo, verbose, maxPasos } = leerOpciones(process.argv.slice(2));
  const fuente = validarEntrada(archivo);
  if (!fuente) return 1;

  console.log('Compilando...');
  let compilado: ResultadoCompilacion;
  try {
    compilado = await compilar(fuente);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
  console.log('Compilación correcta');

  // Cierra gdb y borra el binario al terminar, o si hay Ctrl+C
  let gdb: GdbClient | undefined;
  const limpiarTodo = async () => {
    await gdb?.close().catch(() => {});
    compilado.limpiar();
  };
  // Ctrl+C: cerrar gdb y borrar el binario antes de salir.
  process.once('SIGINT', () => void limpiarTodo().finally(() => process.exit(130)));

  // Incio del programa
  try {
    const faltantes = variablesFaltantes(fs.readFileSync(fuente, 'utf8'), ['x', 'y']);
    if (faltantes.length) {
      console.error(`Falta declarar la variable int: ${faltantes.join(', ')}`);
      return 1;
    }
    console.log('Variables x e y encontradas');

    gdb = new GdbClient(compilado.rutaBinario, TIMEOUT_GDB_MS);
    await recorrerPrograma(gdb, verbose, maxPasos);
    return 0;
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    return 1;
  } finally {
    await limpiarTodo();
  }
}

// Ejecuta main() y termina con el código de salida que devuelva
main().then((codigo) => process.exit(codigo));
