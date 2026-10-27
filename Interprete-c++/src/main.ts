import { ControladorJuego, CODIGO_EJEMPLO, NIVEL_EJEMPLO } from './game';
import { formatearError, type Ejecucion } from './lang';
import { crearJuegoPhaser } from './phaser/crearJuego';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const editor = el<HTMLTextAreaElement>('codigo');
const salida = el<HTMLPreElement>('salida');
const btnEjecutar = el<HTMLButtonElement>('ejecutar');
const btnDetener = el<HTMLButtonElement>('detener');
const btnReiniciar = el<HTMLButtonElement>('reiniciar');

editor.value = CODIGO_EJEMPLO;

// Tab inserta espacios en vez de saltar fuera del editor.
editor.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end');
});

const mostrar = (texto: string, esError = false) => {
  salida.textContent = texto;
  salida.classList.toggle('error', esError);
};

let ejecucion: Ejecucion | null = null;
const fijarEnEjecucion = (corriendo: boolean) => {
  btnEjecutar.disabled = corriendo;
  btnReiniciar.disabled = corriendo; // reiniciar a mitad de una animación dejaría la Promise colgada
  btnDetener.disabled = !corriendo;
  editor.readOnly = corriendo;
};

// Se habilita todo hasta que Phaser termina de crear la escena.
fijarEnEjecucion(true);
btnDetener.disabled = true;

let juego: ControladorJuego | null = null;
crearJuegoPhaser('juego', NIVEL_EJEMPLO).then((vista) => {
  juego = new ControladorJuego(vista, NIVEL_EJEMPLO);
  fijarEnEjecucion(false);
  mostrar('Listo. Escribe tu código y pulsa "Ejecutar".');
});

btnEjecutar.addEventListener('click', async () => {
  if (!juego) return;
  fijarEnEjecucion(true);
  mostrar('Ejecutando...');
  ejecucion = juego.ejecutar(editor.value);

  try {
    const r = await ejecucion.terminado;
    mostrar(
      r.estado === 'cancelado'
        ? 'Ejecución detenida.'
        : `Terminó (${r.pasos} pasos). Basuras recogidas: ${juego.estado.recogidas}.`,
    );
  } catch (e) {
    mostrar(formatearError(e), true);
  } finally {
    ejecucion = null;
    fijarEnEjecucion(false);
  }
});

btnDetener.addEventListener('click', () => ejecucion?.cancelar());
btnReiniciar.addEventListener('click', () => {
  juego?.reiniciar();
  mostrar('Tablero reiniciado.');
});
