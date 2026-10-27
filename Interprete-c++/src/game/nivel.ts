import type { ConfigTablero } from './estado';

// Un tablero de ejemplo: el robot empieza arriba a la izquierda mirando a la derecha.
export const NIVEL_EJEMPLO: ConfigTablero = {
  filas: 8,
  columnas: 8,
  inicio: { fila: 0, col: 0 },
  dir: 1,
  basuras: [
    { fila: 2, col: 3 },
    { fila: 0, col: 6 },
    { fila: 5, col: 5 },
  ],
  paredes: [
    { fila: 3, col: 1 },
    { fila: 3, col: 2 },
    { fila: 6, col: 4 },
  ],
};

export const CODIGO_EJEMPLO = `int pasos = 3;

for (int i = 0; i < pasos; i++) {
    avanzar();
}

if (pasos > 2) {
    girarDerecha();
}

int contador = 0;
while (contador < 2) {
    avanzar();
    contador++;
}

if (hayBasura()) {
    recogerBasura();
}
`;
