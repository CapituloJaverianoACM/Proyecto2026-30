#include <iostream>

int main() {
    int x = 0, y = 0;
    const int ancho = 3, alto = 2;

    for (int i = 0; i < ancho; i++) {
        x++;                          // derecha
    }
    for (int i = 0; i < alto; i++) {
        y++;                          // abajo
    }
    for (int i = 0; i < ancho; i++) {
        x--;                          // izquierda
    }
    for (int i = 0; i < alto; i++) {
        y--;                          // arriba
    }

    x += 2; y += 1;                   // derecha y abajo
    std::cout << "fin: " << x << "," << y << std::endl;  // salida del programa
    return 0;
}
