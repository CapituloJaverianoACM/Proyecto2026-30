import type { Nivel } from "../niveles/tipos";

// ===== Panel lateral (HTML): las escenas lo controlan solo a través de estas funciones =====
const panel = document.getElementById("panel")!;
const titulo = document.getElementById("titulo-nivel")!;
const texto = document.getElementById("texto-nivel")!;
const codigo = document.getElementById("codigo") as HTMLTextAreaElement;

export function mostrarPanel(nivel: Nivel, numero: number): void {
  titulo.textContent = `Nivel ${numero}: ${nivel.nombre}`;
  texto.textContent = nivel.texto;
  panel.hidden = false;
}

export function ocultarPanel(): void {
  panel.hidden = true;
}

// true si el jugador está escribiendo en el área de código
export function escribiendoCodigo(): boolean {
  return document.activeElement === codigo;
}
