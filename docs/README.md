# Backend — Web de Obsidian

# Documentacion? -> esta en el .typ
# ER -> https://dbdiagram.io/d -> en un archivo .dbml

#Guia para la compilacion 

API construida con NestJS, Prisma y PostgreSQL (Supabase).

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | NestJS 12 |
| ORM | Prisma 7.10.0 (con driver adapter `@prisma/adapter-pg`) |
| Base de datos | PostgreSQL en Supabase |
| Lenguaje | TypeScript 6 (ESM) |
| Gestor de paquetes | pnpm 12.3.4 |

---

# Instalación

Sigue la sección de tu sistema operativo. Si algo falla, mira **Problemas comunes** al final.

## 🐧 Linux / macOS

### 1. Instalar Node.js 24+

Verifica si ya lo tienes:

```bash
node --version
```

Si no llega a v24, instálalo con nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# cierra y abre la terminal
nvm install 24
nvm use 24
```

### 2. Activar pnpm

```bash
corepack enable
```

Si `corepack` da error de permisos, usa `sudo corepack enable`.

### 3. Clonar e instalar

```bash
git clone <url-del-repo>
cd Proyecto2026-30
pnpm install
```

### 4. Configurar credenciales

```bash
cd packages/backend
cp .env.example .env
```

Abre el `.env` con tu editor y pega las cadenas de conexión reales. **Pídelas por privado** — no están en el repositorio.

```bash
nano .env    # o code .env, vim .env, etc.
```

### 5. Verificar

```bash
pnpm start:dev
```

En **otra terminal**:

```bash
curl localhost:3000
```

Debe responder `{"mensaje":"Backend conectado","usuarios":0}`.

---

## 🪟 Windows

Usa **PowerShell**, no CMD. Ábrelo desde el menú inicio.

### 1. Instalar Node.js 24+

Verifica:

```powershell
node --version
```

Si no lo tienes o es viejo:

```powershell
winget install OpenJS.NodeJS.LTS
```

Cierra y vuelve a abrir PowerShell para que tome el cambio.

### 2. Permitir la ejecución de scripts

Windows bloquea los scripts de pnpm por defecto. Sin este paso vas a ver `no se puede cargar el archivo pnpm.ps1`:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Confirma con `S` o `Y`. Solo afecta a tu usuario, no a todo el sistema.

### 3. Activar pnpm

```powershell
corepack enable
```

Si falla por permisos, abre PowerShell **como administrador** (clic derecho → Ejecutar como administrador) y repítelo.

### 4. Clonar e instalar

```powershell
git clone <url-del-repo>
cd Proyecto2026-30
pnpm install
```

> **Evita rutas con espacios o tildes.** `C:\Users\Tu Nombre\Documentos del Semestre\` da problemas con algunas herramientas. Algo como `C:\dev\Proyecto2026-30` es más seguro.

### 5. Configurar credenciales

```powershell
cd packages\backend
Copy-Item .env.example .env
```

Ábrelo con VS Code:

```powershell
code .env
```

> No intentes crear el `.env` desde el Explorador de Windows: no deja poner nombres que empiecen con punto. Usa el comando de arriba o créalo desde VS Code.

Pega las cadenas de conexión reales. **Pídelas por privado.**

### 6. Verificar

```powershell
pnpm start:dev
```

En **otra terminal**:

```powershell
curl.exe localhost:3000
```

> Fíjate en el `.exe`. En PowerShell, `curl` a secas es un alias de `Invoke-WebRequest` y se comporta distinto. Alternativa: `Invoke-RestMethod localhost:3000`.

Debe responder `{"mensaje":"Backend conectado","usuarios":0}`.

---

## Variables de entorno

El archivo `.env` va en `packages/backend/` y necesita exactamente estas dos:

```bash
# Transaction pooler (puerto 6543) — la usa la aplicación en runtime
DATABASE_URL="postgresql://postgres.REF:PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session pooler (puerto 5432) — la usa el CLI de Prisma para migraciones
DIRECT_URL="postgresql://postgres.REF:PASSWORD@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

Son distintas a propósito. Las migraciones necesitan una conexión que conserve el estado de sesión, y el transaction pooler no lo hace.

## Comandos

Todos se corren desde `packages/backend/`. Son idénticos en Linux, macOS y Windows.

```bash
pnpm start:dev      # servidor en modo watch
pnpm build          # compilar a dist/
pnpm lint           # oxlint
pnpm test           # tests unitarios
pnpm db:generate    # regenerar el cliente de Prisma
pnpm db:studio      # explorador visual de la base de datos
```

Desde la raíz del monorepo también funciona `pnpm --filter backend start:dev`.

---

## ⚠️ Base de datos compartida: reglas del equipo

**Los nueve usamos la misma base de datos.** Un cambio de esquema afecta a todos al instante. Sigan estas reglas o vamos a perder datos.

### Solo una persona corre migraciones

Únicamente el encargado del esquema ejecuta `pnpm db:migrate`. Si necesitas un cambio en el modelo de datos, avísalo en el grupo y que esa persona lo aplique.

### Después de un `git pull` con migraciones nuevas

No corras `migrate dev`. La migración ya está aplicada en la base compartida; solo necesitas regenerar el cliente:

```bash
pnpm db:generate
```

### Nunca corras `prisma migrate reset`

Ese comando **borra todos los datos** de la base. Como es compartida, borrarías el trabajo de los otros ocho. No hay deshacer.

### Cuidado al modificar `schema.prisma`

Si editas el schema y corres cualquier comando de Prisma, puede detectar una diferencia con la base y ofrecerte "arreglarla" reseteando. Si ves la palabra `reset` en un prompt, responde que no y pregunta en el grupo.

### El plan gratuito se pausa

Si nadie usa el proyecto durante una semana, Supabase lo suspende. Se reactiva desde el dashboard.

---

## Convenciones de código

### Los imports llevan `.js`, aunque el archivo sea `.ts`

El proyecto usa ESM (`"type": "module"`). TypeScript exige que los imports relativos apunten al archivo *compilado*:

```typescript
import { PrismaService } from './prisma/prisma.service.js';  // ✅
import { PrismaService } from './prisma/prisma.service';     // ❌ TS2307
import { PrismaService } from './prisma/prisma.service.ts';  // ❌ TS5097
```

Los imports de paquetes (`@nestjs/common`, `rxjs`) no llevan extensión.

Esto confunde a todo el mundo la primera vez. Si ves `Cannot find module` en un archivo tuyo, casi siempre es esto.

### Rutas en el código: siempre con `/`

Aunque estés en Windows, en el código TypeScript los imports usan `/`, nunca `\`. El backslash solo aplica al escribir rutas en PowerShell.

### Acceso a la base de datos

`PrismaService` está registrado como módulo global, así que puedes inyectarlo directamente sin importar `PrismaModule`:

```typescript
@Injectable()
export class NotasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(usuarioId: number) {
    return this.prisma.nota.findMany({ where: { usuarioId } });
  }
}
```

### Qué no se commitea

- `.env` — contiene credenciales
- `src/generated/` — se regenera con `pnpm db:generate`
- `node_modules/`, `dist/`

### Qué sí se commitea

- `prisma/migrations/` — es el historial compartido del esquema
- `prisma/schema.prisma`
- `.env.example`

## Estructura

```
packages/backend/
├── prisma/
│   ├── migrations/          # historial del esquema (versionado)
│   └── schema.prisma        # modelo de datos
├── prisma7.config.ts        # configuración del CLI de Prisma
├── src/
│   ├── generated/prisma/    # cliente generado (ignorado por git)
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts
└── .env                     # credenciales (ignorado por git)
```

## Modelo de datos

Seis tablas: `usuarios`, `carpetas`, `notas`, `enlaces_a_otro_archivo`, `etiquetas` y `nota_etiqueta`.

Las carpetas son recursivas mediante `parent_id`, lo que permite anidamiento infinito. Los enlaces entre notas usan una tabla de unión con llave primaria compuesta, y son los que alimentan el grafo de conocimiento. El diagrama completo está en `docs/diagramaER.dbml`.

---

## Problemas comunes

### En cualquier sistema

**`Command "start:dev" not found`**
Estás en la carpeta equivocada. Los scripts solo corren desde `packages/backend/`.

**`Cannot find module './algo'`**
Falta la extensión `.js` en el import.

**`P1000: Authentication failed`**
Revisa el `.env`: que la contraseña no tenga los corchetes `[ ]` del placeholder de Supabase, y que el usuario sea `postgres.REF` (con el punto y el project ref), no solo `postgres`.

**`P1001: Can't reach database server`**
La conexión directa de Supabase es IPv6. Si tu red es IPv4, usa las cadenas del pooler (las del `.env.example`).

**`Environment variable not found`**
Falta el `.env`, o no está en `packages/backend/`.

**El cliente de Prisma no existe**
Corre `pnpm db:generate`.

### Solo en Windows

**`No se puede cargar el archivo pnpm.ps1 porque la ejecución de scripts está deshabilitada`**
Te saltaste el paso 2. Corre `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

**`curl` devuelve algo raro o pide parámetros**
Usa `curl.exe localhost:3000` o `Invoke-RestMethod localhost:3000`.

**`EPERM` o `ENOENT` durante `pnpm install`**
Suele ser el antivirus bloqueando la escritura en `node_modules`, o una ruta demasiado larga. Mueve el proyecto a una ruta corta como `C:\dev\`.

**Git marca archivos como modificados sin que los hayas tocado**
Son los finales de línea (CRLF vs LF). Ver la sección siguiente.

### Solo en Linux / macOS

**`corepack: permission denied`**
Usa `sudo corepack enable`.

**El puerto 3000 está ocupado**
Encuentra el proceso con `lsof -i :3000` y ciérralo, o cambia `PORT` en tu `.env`.

---

## Nota para equipos mixtos: finales de línea

Windows y Linux usan caracteres distintos para el salto de línea. Sin configuración, Git puede marcar archivos completos como modificados solo por eso, y los diffs se vuelven imposibles de leer.

Ya hay un `.gitattributes` en la raíz que lo normaliza. Si aun así ves diffs fantasma, corre una vez:

```bash
git config --global core.autocrlf input    # Linux / macOS
git config --global core.autocrlf true     # Windows
```
