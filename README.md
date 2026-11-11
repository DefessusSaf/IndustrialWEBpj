# SIDE B — module 4

Музыкальный портал SIDE B с API статуса, автоматическими тестами, GitHub Actions и Docker.

## Локальный запуск

```bash
pnpm install
pnpm test
pnpm start
```

После запуска откройте `http://localhost:3000`. Проверочные API-маршруты:

- `GET /api/status` — состояние сервера;
- `GET /api/info` — информация о приложении.

## Docker

```bash
docker build -t side-b-web:2.0 .
docker run --rm -p 3000:3000 side-b-web:2.0
```

Или: `docker compose up --build`.

## CI

Файл `.github/workflows/ci.yml` запускает тесты на Node.js 22 при каждом push и pull request.
