// Metodos para compilar y usar el debugger con el programa compilado

//Importa spawn de node:child_process para ejecutar g++ y fs, os, path para manejar archivos y directorios temporales
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Tiene donde está el binario compilado y un método para limpiar el directorio temporal
export interface ResultadoCompilacion {
  rutaBinario: string;
  // Borra el directorio temporal con el binario.
  limpiar: () => void;
}

// Compila con g++ a un directorio temporal. Rechaza con el stderr del compilador si falla
// Devuelve una promesa que resuelve con la ruta del binario y un método para limpiar el directorio temporal (promesa = asincrónica)
export async function compilar(source: string): Promise<ResultadoCompilacion> {
  // Crea un directorio temporal para el binario
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poc-gdb-'));
  const rutaBinario = path.join(dir, 'programa');
  const limpiar = () => fs.rmSync(dir, { recursive: true, force: true });

  try {
    await new Promise<void>((resolve, reject) => {
      // Ejecuta g++ para compilar el código fuente, sin optimización y con información de depuración (-g)
      const p = spawn('g++', ['-g', '-O0', '-std=c++17', source, '-o', rutaBinario]);
      let stderr = '';
      // Captura el stderr del compilador para mostrarlo si hay un error
      p.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
      p.on('error', (e: NodeJS.ErrnoException) =>
        reject(new Error(e.code === 'ENOENT' ? 'g++ no encontrado en el PATH' : e.message)),
      );

      // Cuando el proceso termina, acepta (resolve) o rechaza la promesa según el código de salida
      p.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`Error de compilación:\n${stderr}`)),
      );
    });
  } catch (e) {
    // Si hay error, limpia el directorio temporal y lanza error
    limpiar();
    throw e;
  }
  return { rutaBinario, limpiar };
}

// Quita comentarios y literales para que la regex no se confunda con ellos
// Usa /..../g y /m para que funcione con varias líneas y para todo el texto
function stripNoise(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

/*
  Detecta una declaración int <nombre> Acepta:
    int x;   int x = 5;   int a, x;   int *x;   for (int x = 0; ...)
  y rechaza funciones int x().
  Regex: 'int' + espacios + (opcional: lo que haya antes de x hasta ';' o '{', terminando en
  coma, espacio, asterisco o ampersand) + el nombre + que no le siga '('.
 */
export function tieneVariableInt(source: string, name: string): boolean {
  const re = new RegExp(`\\bint\\s+(?:[^;{}]*?[,\\s*&])?${name}\\b(?!\\s*\\()`);
  return re.test(stripNoise(source));
}

// Revisa si todas las variables de names están declaradas en source. Devuelve un array con los nombres que faltan
export function variablesFaltantes(source: string, names: string[]): string[] {
  return names.filter((n) => !tieneVariableInt(source, n));
}
