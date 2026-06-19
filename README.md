# Tablero Pro

Aplicación de gestión de proyectos en tiempo real con tablero Kanban. Arquitectura de microservicios con monorepo Turborepo.

---

## Índice

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos](#requisitos)
5. [Configuración del entorno](#configuración-del-entorno)
6. [Levantar el proyecto](#levantar-el-proyecto)
7. [Credenciales de prueba](#credenciales-de-prueba)
8. [Servicios y puertos](#servicios-y-puertos)
9. [API Reference](#api-reference)
10. [Base de datos](#base-de-datos)
11. [Autenticación](#autenticación)
12. [Tiempo real (SSE)](#tiempo-real-sse)
13. [Control de acceso (RBAC)](#control-de-acceso-rbac)
14. [Tests E2E](#tests-e2e)
15. [Variables de entorno](#variables-de-entorno)

---

## Descripción general

**Tablero Pro** es una herramienta de gestión de proyectos colaborativa. Permite a equipos organizar su trabajo en tableros Kanban con columnas y tareas. Los cambios se reflejan en tiempo real para todos los usuarios conectados al mismo proyecto sin necesidad de recargar la página.

**Funcionalidades:**

- Autenticación con JWT (access token 15 min + refresh token 7 días con renovación automática)
- Workspaces con miembros y roles
- Proyectos dentro de workspaces
- Tablero Kanban con drag & drop
- Creación, edición y eliminación de tareas y columnas
- Sincronización en tiempo real vía SSE (Server-Sent Events)
- Notificaciones cuando te asignan una tarea
- Control de permisos basado en roles (RBAC)

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                          Browser                             │
│   Next.js 16 (App Router + Turbopack)                        │
│   Zustand (estado local)  ·  TanStack Query (cache API)      │
│   SSE directo al tasks-service (:4003)                       │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP / rewrite proxy (/api/*)
         ┌──────────────┼───────────────────┐
         │              │                   │
         ▼              ▼                   ▼
   auth-service   projects-service    tasks-service
      :4001            :4002              :4003
         │              │                   │
         └──────────────┴───────────────────┘
                        │
               notifications-service
                      :4004
                        │
               PostgreSQL :5434
            (Prisma ORM compartido)
```

**Flujo de datos:**

- El frontend se comunica con los servicios a través de rewrites de Next.js (`/api/auth/*`, `/api/projects/*`, `/api/tasks/*`, `/api/notifications/*`)
- La conexión SSE se hace **directamente** al tasks-service `:4003` para evitar el buffering del proxy de Next.js
- Todos los servicios comparten la misma base de datos PostgreSQL a través del paquete `@tablero-pro/database`

---

## Estructura del proyecto

```
tablero-pro/
├── apps/
│   └── web/                          # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/login/     # Página de login
│       │   │   ├── (dashboard)/
│       │   │   │   ├── workspaces/   # Gestión de workspaces
│       │   │   │   └── projects/     # Tablero Kanban
│       │   │   └── api/tasks/sse/    # Ruta SSE streaming (backup)
│       │   ├── components/
│       │   │   ├── kanban/           # BoardView, KanbanColumn, TaskCard, TaskDetailPanel
│       │   │   ├── layout/           # Sidebar, Header
│       │   │   ├── notifications/    # Campana de notificaciones
│       │   │   ├── users/            # Panel de miembros
│       │   │   └── workspaces/       # Gestión de workspaces
│       │   ├── hooks/
│       │   │   ├── useProjectSSE.ts  # Conexión SSE en tiempo real
│       │   │   └── useWorkspaceRole.ts
│       │   ├── lib/
│       │   │   ├── auth.ts           # Configuración NextAuth v5
│       │   │   └── api/              # Clientes de API (axios + helpers)
│       │   └── store/
│       │       └── kanban.store.ts   # Estado Zustand del tablero
│       └── e2e/
│           └── sse-sync.spec.ts      # Tests E2E Playwright (SSE)
│
├── services/
│   ├── auth-service/        # Registro, login, JWT, refresh tokens   :4001
│   ├── projects-service/    # Workspaces y proyectos                  :4002
│   ├── tasks-service/       # Columnas, tareas, SSE                   :4003
│   └── notifications-service/ # Notificaciones push                   :4004
│
└── packages/
    ├── database/            # Prisma schema + cliente compartido
    │   └── prisma/
    │       ├── schema.prisma
    │       ├── migrations/
    │       └── seed.mjs     # Datos iniciales para desarrollo
    └── types/               # Tipos TypeScript compartidos (DTOs, SSE events)
```

---

## Requisitos

| Herramienta | Versión mínima |
| ----------- | -------------- |
| Node.js     | 20.0.0         |
| npm         | 11.x           |
| Docker      | 20.x           |

---

## Configuración del entorno

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el archivo `.env`

```bash
cp .env.example .env
```

El `.env` va en la **raíz del monorepo** y es cargado automáticamente por todos los servicios al correr `npm run dev`.

### 3. Levantar PostgreSQL

```bash
docker compose up -d
```

Levanta PostgreSQL en el puerto **5434**.

### 4. Aplicar migraciones

```bash
cd packages/database
$env:DATABASE_URL="postgresql://tablero:tablero_secret@127.0.0.1:5434/tablero_pro?sslmode=disable"
npx prisma migrate dev
cd ../..
```

### 5. Seed (datos iniciales)

Crea usuarios de prueba, workspace, proyecto y columnas. Requiere que el **auth-service esté corriendo**.

```bash
# Primero levanta los servicios:
npm run dev

# Luego en otra terminal:
cd packages/database
$env:DATABASE_URL="postgresql://tablero:tablero_secret@127.0.0.1:5434/tablero_pro?sslmode=disable"
node prisma/seed.mjs
```

---

## Levantar el proyecto

```bash
npm run dev
```

Turbo levanta todos los servicios en paralelo cargando el `.env` raíz automáticamente.

Para levantar un solo servicio:

```bash
npm run dev --workspace=@tablero-pro/tasks-service
```

Para matar procesos en los puertos y reiniciar limpio (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 3000,4001,4002,4003,4004 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
npm run dev
```

---

## Credenciales de prueba

Creadas por el seed:

| Email                 | Contraseña    | Rol    |
| --------------------- | ------------- | ------ |
| `juan@test.com`       | `Test1234!`   | OWNER  |
| `owner_e2e@test.com`  | `E2eTest123!` | ADMIN  |
| `member_e2e@test.com` | `E2eTest123!` | MEMBER |

> Para probar la sincronización en tiempo real, abre una ventana de incógnito (`Ctrl+Shift+N`) para el segundo usuario. Dos pestañas del mismo navegador comparten la sesión y actuarán como el mismo usuario.

---

## Servicios y puertos

| Servicio              | Puerto | Swagger                        |
| --------------------- | ------ | ------------------------------ |
| Next.js (frontend)    | 3000   | —                              |
| auth-service          | 4001   | http://localhost:4001/api-docs |
| projects-service      | 4002   | http://localhost:4002/api-docs |
| tasks-service         | 4003   | http://localhost:4003/api-docs |
| notifications-service | 4004   | —                              |
| PostgreSQL            | 5434   | —                              |

Verificar estado:

```bash
curl http://localhost:4003/health
# { "status": "ok", "sseConnections": 2, "sseByProject": { "<projectId>": 2 } }
```

---

## API Reference

### Auth Service — `http://localhost:4001`

| Método | Ruta        | Descripción                       | Auth |
| ------ | ----------- | --------------------------------- | ---- |
| POST   | `/register` | Registra un nuevo usuario         | No   |
| POST   | `/login`    | Inicia sesión, retorna JWT tokens | No   |
| POST   | `/refresh`  | Renueva el access token           | No   |
| POST   | `/logout`   | Invalida el refresh token         | No   |
| GET    | `/users`    | Lista todos los usuarios          | Sí   |

**Respuesta de login:**

```json
{
  "success": true,
  "data": {
    "usuario": { "id": "...", "name": "...", "email": "..." },
    "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
  }
}
```

---

### Projects Service — `http://localhost:4002`

| Método | Ruta                      | Descripción                     | Auth |
| ------ | ------------------------- | ------------------------------- | ---- |
| POST   | `/workspaces`             | Crea workspace                  | Sí   |
| GET    | `/workspaces`             | Lista workspaces del usuario    | Sí   |
| GET    | `/workspaces/:id`         | Obtiene workspace               | Sí   |
| PATCH  | `/workspaces/:id`         | Actualiza workspace             | Sí   |
| DELETE | `/workspaces/:id`         | Elimina workspace               | Sí   |
| GET    | `/workspaces/:id/members` | Lista miembros                  | Sí   |
| POST   | `/workspaces/:id/members` | Agrega miembro directo          | Sí   |
| POST   | `/workspaces/:id/invite`  | Invita miembro por email        | Sí   |
| POST   | `/projects`               | Crea proyecto                   | Sí   |
| GET    | `/projects?workspaceId=`  | Lista proyectos de un workspace | Sí   |
| GET    | `/projects/:id`           | Obtiene proyecto                | Sí   |
| PATCH  | `/projects/:id`           | Actualiza proyecto              | Sí   |
| DELETE | `/projects/:id`           | Elimina proyecto                | Sí   |

---

### Tasks Service — `http://localhost:4003`

| Método | Ruta                          | Descripción                  | Rol mínimo  |
| ------ | ----------------------------- | ---------------------------- | ----------- |
| GET    | `/columns?projectId=`         | Lista columnas con tareas    | VIEWER      |
| POST   | `/columns`                    | Crea columna                 | ADMIN/OWNER |
| PATCH  | `/columns/:id`                | Renombra columna             | ADMIN/OWNER |
| DELETE | `/columns/:id`                | Elimina columna y sus tareas | ADMIN/OWNER |
| PATCH  | `/columns/:projectId/reorder` | Reordena columnas            | ADMIN/OWNER |
| POST   | `/tasks`                      | Crea tarea                   | MEMBER+     |
| PATCH  | `/tasks/:id`                  | Edita tarea                  | MEMBER+     |
| PATCH  | `/tasks/:id/move`             | Mueve tarea                  | MEMBER+     |
| DELETE | `/tasks/:id`                  | Elimina tarea                | ADMIN/OWNER |
| POST   | `/tasks/:id/comments`         | Agrega comentario            | MEMBER+     |
| GET    | `/sse/:projectId`             | Stream SSE del proyecto      | MEMBER+     |

---

## Base de datos

### Modelos principales

```
User
 ├── WorkspaceMember → Workspace
 │                        └── Project → Column → Task
 │                                                 ├── TaskTag
 │                                                 ├── Comment
 │                                                 └── Attachment
 └── Notification
```

**Reglas de cascade:**

- Eliminar un workspace elimina en cascada todos sus proyectos, columnas y tareas
- Eliminar una columna elimina en cascada todas sus tareas (`onDelete: Cascade`)
- Eliminar una tarea elimina en cascada sus tags, comentarios y adjuntos

### Migraciones

```bash
cd packages/database

# Nueva migración
$env:DATABASE_URL="<url>"
npx prisma migrate dev --name descripcion_del_cambio

# Estado de migraciones
npx prisma migrate status

# Producción
npx prisma migrate deploy
```

---

## Autenticación

Sistema de **doble token JWT**:

- **Access Token**: dura 15 minutos. Se envía en `Authorization: Bearer <token>` en cada request
- **Refresh Token**: dura 7 días. Se usa para obtener un nuevo access token sin re-login

**Renovación automática (frontend):**
El callback `jwt` de NextAuth verifica la expiración en cada request. Si el access token expira en menos de 60 segundos, llama automáticamente a `POST /refresh`. Si el refresh token también expiró, cierra la sesión y redirige al login.

**Rate limiting (auth-service):**
Máximo 10 intentos de login por IP cada 15 minutos. En desarrollo, el loopback (`::1`) está exento para permitir tests automatizados.

---

## Tiempo real (SSE)

Los cambios en el tablero se propagan en tiempo real usando **Server-Sent Events**.

### Flujo

1. Al abrir un tablero, `useProjectSSE` abre una conexión HTTP persistente a `http://localhost:4003/sse/:projectId`
2. El tasks-service registra la conexión en un `Map<projectId, Set<Response>>`
3. Al crear/editar/eliminar una tarea o columna, el tasks-service llama a `sseService.emitir(projectId, evento)` que escribe el mensaje a **todas las conexiones activas** del proyecto
4. El browser parsea el mensaje SSE y actualiza el store de Zustand → React re-renderiza

### Eventos

| Tipo             | Payload                                      |
| ---------------- | -------------------------------------------- |
| `task.created`   | Objeto tarea completo + `createdById`        |
| `task.updated`   | Objeto tarea + `updatedBy` (userId string)   |
| `task.moved`     | `{ taskId, columnId, order, movedBy }`       |
| `task.deleted`   | `{ taskId }`                                 |
| `column.created` | Objeto columna + `createdBy` (userId string) |
| `column.deleted` | `{ columnId, deletedBy }`                    |

### Skip de eventos propios

Para no duplicar el update optimista, cada browser ignora los eventos que él mismo generó:

```typescript
// El campo *By tiene el userId del creador; si coincide con la sesión actual, se ignora
if (creadorId === userId) return;
```

### Conexión directa (sin proxy)

La conexión SSE va directamente a `:4003` porque Next.js bufferea las respuestas HTTP, lo que impide recibir el stream en tiempo real. La variable `NEXT_PUBLIC_TASKS_SERVICE_URL` controla la URL (default: `http://localhost:4003`).

---

## Control de acceso (RBAC)

### Roles

| Rol      | Permisos                                           |
| -------- | -------------------------------------------------- |
| `OWNER`  | Todo. Creador del workspace.                       |
| `ADMIN`  | Gestionar miembros, proyectos, columnas y tareas.  |
| `MEMBER` | Crear y editar tareas. No puede eliminar columnas. |
| `VIEWER` | Solo lectura.                                      |

Los roles viven en `WorkspaceMember` y se verifican server-side en cada microservicio.

### Helpers en el frontend

```typescript
import { puedeEscribir, puedeAdministrar } from '@/hooks/useWorkspaceRole';

const canWrite = puedeEscribir(role); // MEMBER, ADMIN, OWNER
const canAdmin = puedeAdministrar(role); // ADMIN, OWNER
```

---

## Tests E2E

Tests de sincronización SSE con **Playwright**.

### Setup

```bash
cd apps/web
npx playwright install chromium
```

### Ejecutar

```bash
cd apps/web
npx playwright test

# Con UI visual
npx playwright test --ui
```

### Tests incluidos

| Archivo                | Test                                       |
| ---------------------- | ------------------------------------------ |
| `e2e/sse-sync.spec.ts` | Eliminar columna se propaga en tiempo real |
|                        | Crear columna se propaga en tiempo real    |
|                        | Actualizar tarea se propaga en tiempo real |

Todos los tests requieren los servicios corriendo y usan los usuarios `owner_e2e@test.com` / `member_e2e@test.com` del seed.

---

## Variables de entorno

El archivo `.env` va en la raíz del monorepo. Turbo lo carga con `dotenv-cli` antes de lanzar los servicios.

```env
# ─── Base de datos ──────────────────────────────────────────────
DATABASE_URL=postgresql://tablero:tablero_secret@127.0.0.1:5434/tablero_pro?sslmode=disable

# ─── JWT ────────────────────────────────────────────────────────
JWT_SECRET=dev_jwt_secret_minimo_32_caracteres_aqui
JWT_REFRESH_SECRET=dev_refresh_secret_minimo_32_caracteres

# ─── NextAuth ───────────────────────────────────────────────────
AUTH_SECRET=dev_nextauth_secret_minimo_32_caracteres
AUTH_URL=http://localhost:3000

# ─── Google OAuth (opcional en dev) ─────────────────────────────
GOOGLE_CLIENT_ID=placeholder
GOOGLE_CLIENT_SECRET=placeholder

# ─── AWS S3 / SES (adjuntos y emails) ───────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=placeholder
AWS_SECRET_ACCESS_KEY=placeholder
AWS_S3_BUCKET_NAME=tablero-pro-dev
AWS_SES_FROM_EMAIL=dev@tablero-pro.local

# ─── App ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
SKIP_ENV_VALIDATION=true

# ─── Puertos ────────────────────────────────────────────────────
PORT_AUTH=4001
PORT_PROJECTS=4002
PORT_TASKS=4003
PORT_NOTIFICATIONS=4004
```

> En producción reemplaza todos los `placeholder` y secrets por valores seguros.
