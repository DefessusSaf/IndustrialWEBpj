# SIDE B

Web-приложение на Node.js с регистрацией пользователей, авторизацией, сессиями и CRUD-операциями над заметками. Использует SQLite для хранения данных.

Проект включает автоматизированные тесты, GitHub Actions для CI и поддержку запуска в Docker и Docker Compose.

## Возможности

- Регистрация и авторизация пользователей
- Управление пользовательскими сессиями
- Создание, просмотр, редактирование и удаление заметок
- Защита API-маршрутов от неавторизованного доступа
- SQLite для хранения данных
- Автоматическое тестирование через GitHub Actions
- Контейнеризация с помощью Docker и Docker Compose

## Технологии

- Node.js
- Express
- SQLite
- pnpm
- Git и GitHub Actions
- Docker и Docker Compose

## Требования

- Node.js 22 или новее
- Corepack
- pnpm 9.15.9
- Git
- Docker Desktop (для контейнерного запуска)

## Локальный запуск

Откройте каталог проекта в терминале и выполните:

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile
pnpm start
```

Приложение будет доступно по адресу:

**http://localhost:3000**

Основные страницы:

- `/` - главная страница
- `/account.html` - регистрация и авторизация
- `/labs.html` - работа с заметками

Для остановки сервера нажмите `Ctrl+C`.

## Тестирование

Запуск автоматических тестов:

```powershell
pnpm test
```

Тесты проверяют основные сценарии работы приложения:

- Регистрацию и авторизацию
- Управление сессиями
- Контроль доступа к защищённым маршрутам
- CRUD-операции над заметками
- API приложения

## API

| Endpoint | Назначение |
|---|---|
| `GET /api/status` | Состояние сервера |
| `GET /api/info` | Информация о приложении |
| `GET /api/me` | Информация об авторизованном пользователе |

Проверка API в PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/status
Invoke-RestMethod http://localhost:3000/api/info
```

Для неавторизованного запроса к `GET /api/me` сервер возвращает HTTP 401.

## GitHub Actions

CI настроен в `.github/workflows/ci.yml`.

Workflow запускается при событиях `push` и `pull_request` и выполняет следующие действия:

1. Получает исходный код репозитория.
2. Настраивает Node.js и pnpm.
3. Устанавливает зависимости.
4. Запускает `pnpm test`.

Результаты выполнения доступны во вкладке **Actions** репозитория GitHub.

## Docker

Сборка образа:

```powershell
docker build -t side-b-web:2.0 .
```

Запуск контейнера:

```powershell
docker run -d --name side-b -p 3000:3000 -e PORT=3000 -e COOKIE_SECURE=false -e DB_PATH=/app/data/side-b.db -v side-b-data:/app/data side-b-web:2.0
```

Проверка:

```powershell
docker ps
docker logs side-b
```

Приложение будет доступно по адресу **http://localhost:3000**.

Остановка и удаление контейнера:

```powershell
docker stop side-b
docker rm side-b
```

Данные SQLite сохраняются в именованном томе `side-b-data`.

## Docker Compose

Запуск:

```powershell
docker compose up --build -d
```

Проверка состояния и журналов:

```powershell
docker compose ps
docker compose logs -f
```

При стандартной конфигурации приложение доступно по адресу **http://localhost:3001**.

Остановка:

```powershell
docker compose down
```

Для изменения внешнего порта:

```powershell
$env:HOST_PORT=3005
docker compose up --build -d
```

После этого приложение будет доступно по адресу **http://localhost:3005**.

Удаление контейнеров и томов с данными:

```powershell
docker compose down -v
```

Команда `-v` удаляет именованные тома, включая сохранённую базу данных.

## Конфигурация

Основные переменные окружения:

| Переменная | Назначение |
|---|---|
| `PORT` | Порт сервера |
| `DB_PATH` | Путь к файлу SQLite |
| `COOKIE_SECURE` | Использование Secure-флага для cookie |
| `SESSION_SECRET` | Секрет для подписывания сессий |

Для локального запуска по HTTP используется `COOKIE_SECURE=false`. При публикации приложения по HTTPS необходимо включить Secure-флаг и задать собственный `SESSION_SECRET`.

Не добавляйте секреты и `.env` в Git-репозиторий.

---

**SIDE B** - Web-приложение с автоматизированным тестированием и поддержкой контейнерного развёртывания.