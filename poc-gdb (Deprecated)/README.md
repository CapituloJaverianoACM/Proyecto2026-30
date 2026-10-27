# Revisar movimientos con GDB-MI 

Compila un archivo C++, lo ejecuta paso a paso con GDB y muestra hacia dónde se mueven las variables `int x` e `int y`.

## Requisitos
- Node.js 18+
- `g++` y `gdb` instalados

## Ejecución
```
cd poc-gdb
npm install
npx tsx src/index.ts ejemplo.cpp
```

Opciones:
- `--verbose`: muestra también los pasos sin cambio.
- `--max-steps=N`: límite de pasos (por defecto 10000).

El programa debe declarar `int x` e `int y`.

## Salida de ejemplo
```
[línea 7] x: 0 -> 1, y: 0 -> 0 | Dirección: derecha
[línea 13] x: 3 -> 2, y: 2 -> 2 | Dirección: izquierda
Programa terminado
```

## Notas
- Para invertir el sentido vertical, cambia `Y_AXIS_INVERTED` en `src/movement.ts`.
- La entrada y salida del programa depurado se redirigen a `/dev/null`. (Osea se descartan
)
