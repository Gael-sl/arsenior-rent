<!--
Guidance for AI coding agents working on Arsenior-Rent
Keep this file concise and actionable — reference real files and scripts.
-->

**Repository Overview**
- **App shape:** Monorepo with `frontend/` (Angular standalone components + SSR) and `backend/` (Express + TypeScript).
- **Frontend SSR:** `frontend/server.ts` + `frontend/src/main.server.ts` produce a server bundle under `dist/frontend/server/` (script: `serve:ssr:frontend`).
- **Backend:** TypeScript Express app under `backend/` with folders `controllers/`, `models/`, `routes/`, `middleware/`.

**How To Run (dev)**
- **Frontend (dev):** `cd frontend && npm install && npm start` (runs `ng serve`).
- **Frontend (SSR dev):** after building the frontend SSR bundle, run `cd frontend && npm run serve:ssr:frontend` (this runs the Node server at `dist/frontend/server/server.mjs`).
- **Backend (dev):** `cd backend && npm install && npm run dev` (uses `nodemon --exec ts-node server.ts`).

**Build / Production**
- **Frontend build:** `cd frontend && npm run build` (Angular CLI `ng build`). The SSR server expects built artifacts under `dist/frontend`.
- **Backend build & start:** `cd backend && npm run build` (runs `tsc`) then `npm run start` (expects `dist/server.js`).

**Key Integration Points & Data Flow**
- **Auth flow:** frontend adds auth token with `src/app/interceptors/auth.interceptor.ts`; login + token management in `src/app/services/auth.service.ts`. Backend validates tokens using `jsonwebtoken` (look in `backend/middleware/` and `backend/controllers`).
- **HTTP surface:** frontend uses Angular `provideHttpClient` (see `src/app/app.config.ts`) and routes are client-side (see `src/app/app.routes.ts`). Services in `src/app/services/` encapsulate backend calls.
- **DB & server:** backend uses `sqlite3` / `better-sqlite3` per `backend/package.json`. Models & persistence live in `backend/models/`.

**Frontend-specific patterns**
- **Standalone components:** routes use `loadComponent` for lazy-loaded standalone components (e.g., `src/app/app.routes.ts`). Prefer editing individual component files under `src/app/components/`.
- **Bootstrap:** app uses `bootstrapApplication` (`frontend/src/main.server.ts` and `frontend/src/main.ts`) and merges server config in `src/app/app.config.server.ts`.
- **Guards & interceptors:** auth gating is implemented with `src/app/guards/*.ts` and `src/app/interceptors/auth.interceptor.ts` — use these when adding protected routes or backend calls.

**Backend-specific patterns**
- **Express structure:** controllers in `backend/controllers/`, routes in `backend/routes/`. Follow existing route/controller separation when adding endpoints.
- **TypeScript runtime:** dev uses `ts-node` + `nodemon`. Production expects compiled output in `dist/` after `tsc`.

**Testing & Linting**
- **Frontend tests:** `cd frontend && npm test` (Karma + Jasmine). There is no top-level test runner for backend detected — follow project's existing conventions when adding tests.

**Files to inspect for context or examples**
- `frontend/server.ts` — SSR Express entry and `CommonEngine` usage.
- `frontend/src/main.server.ts` + `frontend/src/app/app.config.server.ts` — server bootstrap and providers.
- `frontend/src/app/app.routes.ts` — canonical routing and lazy-loading examples.
- `frontend/src/app/interceptors/auth.interceptor.ts` and `frontend/src/app/services/auth.service.ts` — auth and HTTP patterns.
- `backend/package.json` and `backend/` subfolders (`controllers/`, `models/`, `routes/`, `middleware/`).

**Agent behavior & constraints (project-specific)**
- When changing frontend routes, keep `loadComponent` lazy loading and update guards in `src/app/guards/`.
- Prefer adding new backend endpoints under `backend/routes/` with paired controller files in `backend/controllers/` and tests where feasible.
- Do not assume extra build scripts exist beyond those in `package.json`; if adding SSR build automation, document it clearly.

If anything here is unclear or you want more detail about a sub-area (auth flow, a specific endpoint, or SSR build steps), say which area and I will expand with concrete file-level instructions and example diffs.
