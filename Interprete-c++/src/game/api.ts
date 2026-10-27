// API del juego: la ÚNICA puerta por la que el código del estudiante toca el juego.
// El estudiante solo puede llamar a las funciones de esta lista; no ve Phaser ni el estado.

import type { FuncionHost } from '../lang/interpreter';
import type { Accion, EstadoJuego } from './estado';

// La vista (Phaser) implementa esto: reproduce la animación y resuelve al terminar.
export type AlAccion = (accion: Accion) => Promise<void> | void;

// Una acción cambia el estado (y lo valida) y produce un evento para la vista.
// Un sensor solo lee el estado. Añadir una función al juego = añadir una fila aquí.
type Definicion =
  | { tipo: 'accion'; nombre: string; ejecutar: (e: EstadoJuego) => Accion }
  | { tipo: 'sensor'; nombre: string; leer: (e: EstadoJuego) => boolean };

const FUNCIONES: readonly Definicion[] = [
  { tipo: 'accion', nombre: 'avanzar', ejecutar: (e) => e.avanzar() },
  { tipo: 'accion', nombre: 'girarDerecha', ejecutar: (e) => e.girarDerecha() },
  { tipo: 'accion', nombre: 'girarIzquierda', ejecutar: (e) => e.girarIzquierda() },
  { tipo: 'accion', nombre: 'recogerBasura', ejecutar: (e) => e.recogerBasura() },
  { tipo: 'sensor', nombre: 'hayPared', leer: (e) => e.hayPared() },
  { tipo: 'sensor', nombre: 'hayBasura', leer: (e) => e.hayBasura() },
];

export function crearApiJuego(estado: EstadoJuego, alAccion: AlAccion): FuncionHost[] {
  return FUNCIONES.map((d): FuncionHost =>
    d.tipo === 'accion'
      ? { nombre: d.nombre, params: [], retorno: 'void', fn: () => alAccion(d.ejecutar(estado)) }
      : { nombre: d.nombre, params: [], retorno: 'bool', fn: () => d.leer(estado) },
  );
}
