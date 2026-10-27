// Execution controller: maneja las pausas del intérprete (generador).
//   - Si el intérprete cede `undefined`, se devuelve el hilo al navegador (UI fluida).
//   - Si cede una Promise (animación del juego), se espera a que termine: así las
//     acciones ocurren una a una y en orden.
//   - cancelar() detiene la ejecución en la siguiente pausa.

import { Interprete, type FuncionHost, type OpcionesInterprete } from './interpreter';
import { parsear } from './parser';

export interface OpcionesEjecucion extends OpcionesInterprete {
  // Cómo ceder el hilo. Por defecto setTimeout(0); se puede cambiar por requestAnimationFrame.
  cederControl?: () => Promise<void>;
}

export interface ResultadoEjecucion {
  estado: 'completado' | 'cancelado';
  pasos: number;
}

export interface Ejecucion {
  // Se rechaza con ErrorLenguaje si hay un error léxico, de sintaxis o de ejecución.
  terminado: Promise<ResultadoEjecucion>;
  cancelar(): void;
}

// MessageChannel devuelve el hilo al navegador (pinta, atiende eventos) sin el retraso
// mínimo de 4 ms que los navegadores imponen a setTimeout(0).
const cederPorDefecto = (): Promise<void> =>
  new Promise<void>((resolver) => {
    if (typeof MessageChannel === 'undefined') {
      setTimeout(resolver, 0);
      return;
    }
    const canal = new MessageChannel();
    canal.port1.onmessage = () => {
      canal.port1.close();
      resolver();
    };
    canal.port2.postMessage(null);
  });

export function ejecutar(fuente: string, funcionesHost: FuncionHost[] = [], opciones: OpcionesEjecucion = {}): Ejecucion {
  let cancelado = false;
  const ceder = opciones.cederControl ?? cederPorDefecto;

  const terminado = (async (): Promise<ResultadoEjecucion> => {
    const programa = parsear(fuente); // errores léxicos y de sintaxis salen aquí, antes de ejecutar nada
    const interprete = new Interprete(programa, funcionesHost, opciones);
    const gen = interprete.ejecutar();

    let paso = gen.next();
    while (!paso.done) {
      if (cancelado) {
        gen.return();
        return { estado: 'cancelado', pasos: interprete.pasos };
      }
      const cedido = paso.value;
      if (cedido === undefined) {
        await ceder();
        paso = gen.next();
      } else {
        try {
          await cedido;
        } catch (err) {
          // La acción falló: el error se lanza dentro del intérprete, en el punto de la llamada.
          paso = gen.throw(err);
          continue;
        }
        paso = gen.next();
      }
    }
    return { estado: 'completado', pasos: interprete.pasos };
  })();

  return { terminado, cancelar: () => { cancelado = true; } };
}
