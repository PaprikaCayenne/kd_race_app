# Kentucky Derby Project. Agent Instructions

## Goal
Keep the project runnable and testable on the Docker host.
Make minimal, safe changes.
Always verify changes before finishing.

## Repo context
This repo runs a Docker Compose stack.
Frontend is served by kd_nginx.
API runs in kd_api and is reachable through Nginx at /api and /api/socket.io.

## Required workflow
1. Create a feature branch named codex/<short-task-name>.
2. Never commit directly to main.
3. Prefer small diffs and clear commit messages.
4. Do not change core race logic unless the user explicitly asks.

## Local run commands
Start services.
docker compose up -d kd_api kd_nginx

View status.
docker compose ps

Logs.
docker compose logs --tail=200 kd_api
docker compose logs --tail=200 kd_nginx

## Verification. Must run after every change
Primary verification command.
npm run verify:all

verify:all must run this exact flow.
1) npm test at repo root
2) frontend build in kd-frontend folder
3) scripts/rebuild_all.sh
4) docker compose up -d --build
5) scripts/smoke_test.sh

Direct smoke command.
npm run smoke

If scripts/smoke_test.sh does not exist, create it.
It should check.
http://localhost:4000/api/horses
http://localhost:8086/
http://localhost:8086/api/horses

## Destructive operations
scripts/hard_reset_db.sh wipes the database.
Only run it if the user explicitly asks for a database wipe.

If hard_reset_db.sh uses docker compose exec, ensure kd_api is started first.

## Safety rules
Do not commit secrets.
Do not commit .env.
Use .env.example with placeholder values.

Avoid broad refactors unless requested.
Prefer targeted fixes with tests.

## Output expectations
When you change code, explain what you changed and how it was verified.
If you add a new command or script, update this file with the new verify step.

## No partial edits
When changing a file, update the full file content.
