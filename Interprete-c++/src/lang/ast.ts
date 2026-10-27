// Árbol de sintaxis abstracta (AST). Cada nodo guarda su posición para los errores.

export type TipoDato = 'int' | 'float' | 'double' | 'bool' | 'char' | 'string';
export type TipoRetorno = TipoDato | 'void';

interface Base {
  linea: number;
  columna: number;
}

// ---------- Expresiones ----------

export interface Literal extends Base {
  nodo: 'literal';
  tipoDato: TipoDato;
  // char se guarda como código numérico.
  valor: number | boolean | string;
}
export interface Variable extends Base {
  nodo: 'variable';
  nombre: string;
}
export interface Unario extends Base {
  nodo: 'unario';
  op: '-' | '+' | '!';
  operando: Expr;
}
export interface Binario extends Base {
  nodo: 'binario';
  op: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=';
  izq: Expr;
  der: Expr;
}
export interface Logico extends Base {
  nodo: 'logico';
  op: '&&' | '||';
  izq: Expr;
  der: Expr;
}
export type OpAsignacion = '=' | '+=' | '-=' | '*=' | '/=' | '%=';
export interface Asignacion extends Base {
  nodo: 'asignacion';
  op: OpAsignacion;
  nombre: string;
  valor: Expr;
}
export interface Incremento extends Base {
  nodo: 'incremento';
  op: '++' | '--';
  prefijo: boolean;
  nombre: string;
}
export interface Llamada extends Base {
  nodo: 'llamada';
  nombre: string;
  args: Expr[];
}

export type Expr = Literal | Variable | Unario | Binario | Logico | Asignacion | Incremento | Llamada;

// ---------- Sentencias ----------

export interface Declarado extends Base {
  nombre: string;
  init?: Expr;
}
export interface Declaracion extends Base {
  nodo: 'declaracion';
  tipoDato: TipoDato;
  esConst: boolean;
  declarados: Declarado[];
}
export interface SentenciaExpr extends Base {
  nodo: 'expresion';
  expr: Expr;
}
export interface Bloque extends Base {
  nodo: 'bloque';
  cuerpo: Sentencia[];
}
export interface Si extends Base {
  nodo: 'si';
  cond: Expr;
  entonces: Sentencia;
  sino?: Sentencia;
}
export interface Mientras extends Base {
  nodo: 'mientras';
  cond: Expr;
  cuerpo: Sentencia;
}
export interface HacerMientras extends Base {
  nodo: 'hacerMientras';
  cuerpo: Sentencia;
  cond: Expr;
}
export interface Para extends Base {
  nodo: 'para';
  init?: Sentencia;
  cond?: Expr;
  paso?: Expr;
  cuerpo: Sentencia;
}
export interface Romper extends Base {
  nodo: 'romper';
}
export interface Continuar extends Base {
  nodo: 'continuar';
}
export interface Retornar extends Base {
  nodo: 'retornar';
  valor?: Expr;
}
export interface Vacia extends Base {
  nodo: 'vacia';
}

export type Sentencia =
  | Declaracion
  | SentenciaExpr
  | Bloque
  | Si
  | Mientras
  | HacerMientras
  | Para
  | Romper
  | Continuar
  | Retornar
  | Vacia;

// ---------- Programa ----------

export interface Parametro {
  tipo: TipoDato;
  nombre: string;
}
export interface FuncionDecl extends Base {
  nombre: string;
  retorno: TipoRetorno;
  params: Parametro[];
  cuerpo: Sentencia[];
}
export interface Programa {
  // Se registran todas antes de ejecutar, así pueden llamarse antes de su declaración.
  funciones: FuncionDecl[];
  // Sentencias sueltas del nivel superior, en orden.
  sentencias: Sentencia[];
}
