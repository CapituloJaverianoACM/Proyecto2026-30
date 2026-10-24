import { Nivel, Posicion } from "../niveles/tipos";

export class Partida {
    bola: Posicion;
    basuras: Posicion[];
    recogidas = 0;

    constructor(readonly nivel: Nivel) {
        this.bola = { ...nivel.inicio };
        this.basuras = [...nivel.basuras];
    }

    mover(df: number, dc: number): boolean {
        const nuevaFila = this.bola.fila + df;
        const nuevaCol = this.bola.col + dc;
        const dentro =
            nuevaFila >= 0 && nuevaFila < this.nivel.filas && nuevaCol >= 0 && nuevaCol < this.nivel.columnas;
        if (dentro) {
            this.bola.fila = nuevaFila;
            this.bola.col = nuevaCol;
        }
        return dentro;
    }

    
    recogerBasura(fila: number, col: number): boolean {
        const indice = this.basuras.findIndex((basura) => basura.fila === fila && basura.col === col);
        if (indice === -1) return false;
    
        this.basuras.splice(indice, 1);
        this.recogidas++;
        return true;
    }

    get terminado(): boolean{
        return this.basuras.length === 0;
    }

}