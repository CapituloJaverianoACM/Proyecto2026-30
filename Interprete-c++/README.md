# Intérprete de un subconjunto de C++ + Phaser

El estudiante escribe un código con sintaxis de C++ y el juego lo ejecuta. El código **no usa `eval` ni `new Function`**: se tokeniza, se convierte en un AST (Árbol de Sintaxis Abstracta ) y un intérprete propio lo recorre.

## Ejecutar

```
cd interprete
npm install
npm run dev        # juego en el navegador (vite)
npm test           # 99 pruebas (vitest)
npm run typecheck
```

## Arquitectura

```
src/lang/          Lenguaje (TypeScript puro, sin Phaser)
  lexer.ts           código fuente -> tokens (con línea y columna)
  parser.ts          tokens -> AST, valida sintaxis y precedencia
  ast.ts             tipos del árbol
  values.ts          tipos, conversiones y operadores
  interpreter.ts     recorre el AST (generadores: puede pausarse)
  runner.ts          controla pausas, animaciones, cancelación
  errors.ts          errores con línea/columna
src/game/          Juego (TypeScript puro, sin Phaser)
  estado.ts          tablero, posición, paredes, basura; valida cada acción
  api.ts             tabla de funciones que el estudiante puede llamar
  vista.ts           interfaz VistaJuego: contrato con cualquier vista
  controlador.ts     ControladorJuego: une estado, intérprete y vista
  nivel.ts           nivel y código de ejemplo
src/phaser/        Vista (única parte que importa Phaser)
  EscenaJuego.ts     implementa VistaJuego; dibuja y anima acciones YA validadas
  crearJuego.ts      crearJuegoPhaser(): crea Phaser.Game y devuelve la vista
src/main.ts        solo UI (editor, botones); usa ControladorJuego
tests/             vitest
```

Flujo de una instrucción como `avanzar();`:

```
Intérprete --llama--> api.avanzar --> EstadoJuego.avanzar() (valida y cambia el estado lógico)
                                          └─ devuelve Accion {mover de→a}
                      api --> escena.animar(accion) --> tween de Phaser --> Promise
Intérprete espera la Promise y sigue con la siguiente instrucción.
```

- El intérprete **no sabe nada de Phaser**: solo ve funciones con nombre, tipos de parámetros y retorno (`FuncionHost`).
- Phaser **no sabe nada del código** del estudiante: solo recibe eventos `Accion`.
- El estudiante solo puede llamar a las funciones que registra `crearApiJuego`. No hay acceso a `window`, `fetch`, etc. (el lenguaje ni siquiera tiene el operador `.`).

## Lenguaje soportado
### Puede expandirse a futuro


| Área | Soportado |
|---|---|
| Tipos | `int`, `float`, `double`, `bool`, `char`, `string`, `void` (solo retorno de funciones), `const` |
| Literales | `42`, `2.5`, `2.5f`, `true`, `false`, `'a'`, `"hola"` (escapes `\n \t \\ \' \" \0`) |
| Aritmética | `+ - * / %`, unarios `- +`; `int / int` es división entera |
| Comparación | `== != < > <= >=` |
| Lógicos | `&& \|\| !` (con cortocircuito) |
| Asignación | `= += -= *= /= %=` (encadenable: `a = b = 3`) |
| Incremento | `++` y `--`, prefijo y postfijo, sobre variables |
| Control | `if`, `else`, `else if`, `for`, `while`, `do while`, `break`, `continue`, bloques `{}` |
| Funciones | declaración, parámetros por valor, `return`, recursión, variables locales y globales |
| Otros | comentarios `//` y `/* */`; `#include` y `using namespace std;` se ignoran |

Los programas pueden ser sentencias sueltas o usar `int main() { ... }` (se llama al final).
Las funciones pueden usarse antes de su declaración.

### Conversiones de tipos

| Destino | Se acepta | Error |
|---|---|---|
| `int` | `int`, `bool`, `char` | `float`/`double` (se perderían decimales) |
| `float`, `double` | cualquier número, `bool`, `char` | `string` |
| `bool` | cualquier número o `bool` (≠ 0 es `true`) | `string` |
| `char` | solo `char` | `int` (usa `'a'`) |
| `string` | solo `string` | `char`, números |

`string + string`, `string + char` y `char + string` concatenan. Las condiciones (`if`, `while`...) aceptan `bool` o números, no texto.
Las asignaciones compuestas (`x += 0.5` con `x` entero) siguen la misma regla: son error.

### Diferencias con C++ real

- Sin `main` obligatorio: puede haber sentencias en el nivel superior.
- Variable sin inicializar vale `0`/`false`/`""` (en C++ suele ser basura).
- `double -> int` implícito es **error** (C++ lo trunca). `/` y `%` entre cero son error (C++: comportamiento indefinido / `inf`).
- `int` es de 32 bits con desbordamiento cíclico, como en C++.
- No hay: arrays, punteros, referencias (`&`), `struct`/`class`, `switch`, operador ternario, `cin`/`cout`, `std::`, operador coma, `goto`, plantillas, sobrecarga.

## Seguridad y límites

Configurables en `ejecutar(fuente, api, opciones)`:

| Opción | Por defecto | Efecto |
|---|---|---|
| `maxPasos` | 100 000 | Aborta ciclos infinitos con "Límite de ejecución" |
| `maxProfundidad` | 200 | Aborta recursión infinita |
| `pasosPorTanda` | 2000 | Cada tanda el intérprete cede el hilo (la página no se congela) |
| `cederControl` | `MessageChannel` | Cómo cede el hilo |

`ejecutar(...)` devuelve `{ terminado: Promise, cancelar() }`. `cancelar()` detiene el programa en la siguiente pausa (si hay una animación en curso, espera a que termine).

## Errores

Todos los errores son `ErrorLenguaje` con `tipo`, `linea`, `columna`. `formatearError(e)` da el texto para el estudiante, por ejemplo:

```
Error de sintaxis (línea 1, columna 10): Se esperaba ";" pero se encontró "avanzar"
Acción inválida (línea 3, columna 5): No puedes avanzar: hay una pared en la fila 3, columna 2
```

Tipos: `lexico`, `sintaxis`, `nombre` (variable no declarada o repetida), `tipo`, `ejecucion` (división entre cero, falta `return`), `funcion` (inexistente, argumentos incorrectos), `juego` (acción inválida), `limite`. `break`/`continue` fuera de un ciclo es un error de `sintaxis`.

## Cómo ampliar

- **Una función del juego nueva** (p. ej. `hayObstaculoIzquierda()`): agregar el método a `EstadoJuego` y una fila en la tabla `FUNCIONES` de `api.ts` (`accion` o `sensor`). Si es acción con animación, añadir un caso a `Accion` y a `EscenaJuego.animar`.
- **Otra vista** (otro motor o escena): implementar `VistaJuego` (`reiniciar`, `animar`) y pasarla a `new ControladorJuego(vista, nivel)`; `src/lang` y `src/game` no cambian.
- **Una función con parámetros o retorno**: `FuncionHost` acepta `params: ['int', ...]` y `retorno: 'int' | 'bool' | ...`.
- **Un operador o sentencia nueva**: nodo en `ast.ts`, regla en `parser.ts`, caso en `interpreter.ts`, tests.
- **Arrays** (pendiente): hacen falta `[`/`]` en el parser (el lexer ya los tokeniza), un tipo `array` en `values.ts` y acceso por índice como expresión asignable (hoy la asignación solo acepta variables).

## Relación con `poc-gdb/`

`poc-gdb` compila C++ real y lo observa con GDB; este intérprete no necesita compilador. El test `compatibilidad con el PoC` ejecuta el mismo `poc-gdb/ejemplo.cpp` en el intérprete y comprueba que `x, y` terminan en `(2, 1)`, igual que en el recorrido que documenta el PoC.

## Por qué usar el interprete

El interprete no requiere de programas de terceros (g++, gcc, ni gdb), por lo que su uso da un menor coste computacional y puede llegar a tener un mejor rendimiento dado que no necesita esperar respuesta del debugger.

El interprete no llega a compilar programas reales, solo los interpreta cómo se parsea en el árbol. Por lo que posible codigo malicioso no es problema ni llega a tener las posibles vulnerabilidades que podria tener el ejecutar código real.

## Limitaciones

- No existe `comportamiento indefinido`, por lo que no hay errores de: 
  - Desbordamiento de números
  - Lectura fuera de rango

- Puede haber diferencias entre los resultados dados por el interprete y los dados por un programa compilado real

- No existe memoria con direcciones
  - No se tienen apuntadores, `sizeof`, diferencia entre stack y heap, ni memoria dinamica

- No hay arreglos implementados, aunque estos pueden ser implementados

- Tampoco se ven implementadas clases (`class`), estructuras (`struct`), plantillas/genericos (`Templates`), exceptiones o un switch

