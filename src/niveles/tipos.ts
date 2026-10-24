export interface Posicion {
    fila: number;
    col: number;
}

export interface Nivel {
    nombre: string;
    filas: number;
    columnas: number;
    inicio: Posicion;
    basuras: Posicion[];
    texto: string;
}
