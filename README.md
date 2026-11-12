# SIDE B — модульное задание №4

Модуль №4 является продолжением проекта SIDE B из модуля №3. Сохранены сайт, регистрация, авторизация, сессии, SQLite и CRUD заметок. Добавлены Git-история, автоматические тесты, GitHub Actions, Docker и Docker Compose.

## 1. Требования

- Node.js 22 или новее
- Git
- pnpm 9.15.9 через Corepack
- Для контейнеризации: Docker Desktop с запущенным Docker Engine

## 2. Локальный запуск (Windows 11 / VS Code)

Откройте папку проекта в VS Code, затем Terminal → New Terminal и выполните:

```powershell
node --version
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm --version
pnpm install --frozen-lockfile
pnpm test
pnpm start
```

Откройте `http://localhost:3000`.

Полезные страницы:

- Главная: `http://localhost:3000`
- Регистрация и вход: `http://localhost:3000/account.html`
- Заметки: `http://localhost:3000/labs.html`

Остановить сервер: `Ctrl+C`.

## 3. Проверка API

```powershell
Invoke-RestMethod http://localhost:3000/api/status
Invoke-RestMethod http://localhost:3000/api/info
```

Ожидаемые данные:

- `/api/status` — `status: success`, сервис `SIDE B`, версия `2.0.0`.
- `/api/info` — название приложения, описание интеграции Git CI/CD и Docker и список функций.

## 4. Проверка функциональности модуля №3

1. Откройте `/account.html`.
2. Зарегистрируйте пользователя: имя, email, пароль и подтверждение пароля.
3. Войдите в систему.
4. Откройте `/labs.html` и создайте заметку.
5. Измените заметку и удалите её.
6. Выйдите из аккаунта.
7. Проверьте, что защищённый `GET /api/me` возвращает HTTP 401 без сессии.

Тесты автоматически проверяют регистрацию, повторную регистрацию, вход, сессию, запрет неавторизованного создания заметок и CRUD.

## 5. Git и GitHub

В архиве сохранена локальная Git-история проекта и ветки. Чтобы привязать собственный удалённый репозиторий:

```powershell
git remote add origin https://github.com/ВАШ_АККАУНТ/ИМЯ_РЕПОЗИТОРИЯ.git
git remote -v
git push -u origin main
git push -u origin feature/status-indicator
```

Если `origin` уже существует, используйте `git remote set-url origin URL`.

Проверить историю и ветки:

```powershell
git log --oneline --all --decorate
git branch -a
git status
```

В проекте есть `.github/workflows/ci.yml`. При `push` и `pull_request` GitHub Actions устанавливает зависимости через pnpm и запускает `pnpm test`. Результат смотрите во вкладке Actions репозитория GitHub.

## 6. Docker

Убедитесь, что Docker Desktop запущен:

```powershell
docker --version
docker info
```

Сборка образа с требуемым тегом 2.0:

```powershell
docker build -t side-b-web:2.0 .
```

Запуск контейнера на порту 3000:

```powershell
docker run -d --name side-b -p 3000:3000 -e PORT=3000 -e COOKIE_SECURE=false -e DB_PATH=/app/data/side-b.db -v side-b-data:/app/data side-b-web:2.0
```

Проверка:

```powershell
docker ps
docker logs side-b
Invoke-RestMethod http://localhost:3000/api/status
Invoke-RestMethod http://localhost:3000/api/info
```

Остановка и удаление контейнера (том с базой при этом сохраняется):

```powershell
docker stop side-b
docker rm side-b
```

## 7. Docker Compose

Вариант Compose публикует приложение на `http://localhost:3001` и сохраняет SQLite в именованном томе:

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f
```

Проверка:

```powershell
Invoke-RestMethod http://localhost:3001/api/status
Invoke-RestMethod http://localhost:3001/api/info
```

Остановка:

```powershell
docker compose down
```

Чтобы также удалить сохранённую базу данных, используйте `docker compose down -v`. В обычной работе эту команду выполнять не нужно.

Можно изменить внешний порт:

```powershell
$env:HOST_PORT=3005
docker compose up --build -d
```

Тогда приложение будет доступно по `http://localhost:3005`.

## 8. Полезные команды Docker

```powershell
docker images
docker ps -a
docker logs side-b
docker stop side-b
docker start side-b
docker rm side-b
```

`docker stop` останавливает контейнер, но сохраняет его. `docker rm` удаляет остановленный контейнер. Образ и именованный том с базой данных удаляются отдельно.

## 9. Примечания

- В контейнере SQLite хранится в `/app/data/side-b.db`, подключён именованный том `side-b-data`.
- Для локальной разработки база по умолчанию находится в `side-b.db` в корне проекта.
- Для учебного запуска по HTTP `COOKIE_SECURE=false`. При публикации приложения по HTTPS необходимо включить secure-cookie и задать собственный `SESSION_SECRET`.
- CI проверяет приложение и тесты. Автоматический деплой на внешний сервер в задании не требуется.
