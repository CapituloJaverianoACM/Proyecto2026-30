import { ejecutar, type FuncionHost, type OpcionesEjecucion } from '../src/lang';

// Funciones de prueba que dejan constancia de lo que el programa les pasó.
export function hostDePrueba(salida: unknown[]): FuncionHost[] {
  const ver = (nombre: string, tipo: FuncionHost['params'][number]): FuncionHost => ({
    nombre,
    params: [tipo],
    retorno: 'void',
    fn: (x) => void salida.push(x),
  });
  return [
    ver('ver', 'int'),
    ver('verD', 'double'),
    ver('verB', 'bool'),
    ver('verS', 'string'),
    ver('verC', 'char'),
    { nombre: 'ver2', params: ['int', 'int'], retorno: 'void', fn: (a, b) => void salida.push([a, b]) },
  ];
}

// Ejecuta un programa y devuelve lo que fue "viendo". Si hay error, se rechaza.
export async function correr(codigo: string, opciones: OpcionesEjecucion = {}, extras: FuncionHost[] = []) {
  const salida: unknown[] = [];
  const r = await ejecutar(codigo, [...hostDePrueba(salida), ...extras], opciones).terminado;
  return { salida, ...r };
}
