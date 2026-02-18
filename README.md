# kd_race_app

Real‑time Kentucky Derby race app with React + Pixi front end and Node/Express + Prisma API.

## Environment variables

### Production
- `DATABASE_URL` – Postgres connection URL.
- `API_ADMIN_PASS` – admin API shared secret for `/api/admin/*`.
- `PORT` – API server port (default `4000`).
- `NODE_ENV` – set to `production`.

### Local development
- `DATABASE_URL` – local Postgres URL (do **not** point at LAN prod DB from Codex).
- `API_ADMIN_PASS` – local admin password for admin panel API calls.
- `PORT` – optional (default `4000`).
- `NODE_ENV=development` (optional).

Use `.env.example` as the template and keep secrets out of git.

## Verification

Primary validation command:

```bash
./scripts/verify.sh
```

`verify.sh` covers:
- root dependency install,
- root optional checks (`lint`, `test`, `typecheck`) when scripts exist,
- frontend install + production build,
- build artifact validation from either:
  - `frontend/frontend_build/*`, or
  - `frontend_build/*`.

Database/network smoke checks are **off by default**. To include them:

```bash
RUN_DB_CHECKS=1 ./scripts/verify.sh
```

This runs `scripts/smoke_test.sh`.
