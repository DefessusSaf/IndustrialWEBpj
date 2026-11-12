"use strict";

const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const app = express();
const databasePath = process.env.DB_PATH || path.join(__dirname, "side-b.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);

db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    author_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(session({
  name: "sideb.sid",
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 30 * 60 * 1000
  }
}));
// Публикуем только пользовательские страницы и статические ресурсы,
 // не открывая браузеру исходники сервера, package.json и файлы базы данных.
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
for (const page of ["index.html", "about.html", "labs.html", "contacts.html", "account.html"]) {
  app.get(`/${page}`, (req, res) => res.sendFile(path.join(__dirname, page)));
}
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/js", express.static(path.join(__dirname, "js")));

app.get("/api/status", (req, res) => {
  res.json({ status: "success", service: "SIDE B", version: "2.0.0" });
});

app.get("/api/info", (req, res) => {
  res.json({
    name: "SIDE B",
    module: "Git CI/CD and Docker",
    features: ["SQLite", "REST API", "sessions", "CI", "Docker"]
  });
});

function fail(res, status, error) {
  return res.status(status).json({ error });
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return fail(res, 401, "Войдите в аккаунт, чтобы продолжить.");
  next();
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateNote(body) {
  const { title, description = "" } = body;
  if (typeof title !== "string" || title.trim().length < 2 || title.trim().length > 120) {
    return "Название должно содержать от 2 до 120 символов.";
  }
  if (typeof description !== "string" || description.trim().length > 1000) {
    return "Заметка должна быть текстом до 1000 символов.";
  }
  return null;
}

app.post("/api/register", (req, res) => {
  const { name, email, password, passwordConfirm } = req.body || {};
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || typeof passwordConfirm !== "string") {
    return fail(res, 400, "Заполните все поля регистрации.");
  }
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 2 || cleanName.length > 60) return fail(res, 400, "Имя должно содержать от 2 до 60 символов.");
  if (!validEmail(cleanEmail)) return fail(res, 400, "Введите корректный email.");
  if (password.length < 8 || password.length > 72 || !/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password)) {
    return fail(res, 400, "Пароль должен содержать 8–72 символа, буквы и цифры.");
  }
  if (password !== passwordConfirm) return fail(res, 400, "Пароли не совпадают.");

  try {
    const passwordHash = bcrypt.hashSync(password, 12);
    const result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(cleanName, cleanEmail, passwordHash);
    res.status(201).json({ message: "Регистрация прошла успешно. Теперь войдите в аккаунт.", userId: result.lastInsertRowid });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return fail(res, 409, "Пользователь с таким email уже существует.");
    console.error(error);
    fail(res, 500, "Не удалось создать аккаунт.");
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") return fail(res, 400, "Введите email и пароль.");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return fail(res, 401, "Неверный email или пароль.");

  req.session.regenerate((error) => {
    if (error) return fail(res, 500, "Не удалось создать сессию.");
    req.session.userId = user.id;
    req.session.save((saveError) => {
      if (saveError) return fail(res, 500, "Не удалось сохранить сессию.");
      db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
      res.json({ message: "Вход выполнен успешно.", user: { id: user.id, name: user.name, email: user.email } });
    });
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT id, name, email, created_at, last_login_at FROM users WHERE id = ?").get(req.session.userId);
  if (!user) return fail(res, 401, "Аккаунт не найден.");
  res.json(user);
});

app.post("/api/logout", requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("sideb.sid", { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production" });
    res.json({ message: "Вы вышли из аккаунта." });
  });
});

app.get("/api/notes", (req, res) => {
  const notes = db.prepare(`
    SELECT notes.id, notes.title, notes.description, notes.author_id, notes.created_at, notes.updated_at, users.name AS author
    FROM notes JOIN users ON users.id = notes.author_id
    ORDER BY notes.updated_at DESC, notes.id DESC
  `).all();
  res.json(notes);
});

app.post("/api/notes", requireAuth, (req, res) => {
  const validationError = validateNote(req.body || {});
  if (validationError) return fail(res, 400, validationError);
  const result = db.prepare("INSERT INTO notes (title, description, author_id) VALUES (?, ?, ?)")
    .run(req.body.title.trim(), req.body.description.trim(), req.session.userId);
  const note = db.prepare("SELECT id, title, description, author_id, created_at, updated_at FROM notes WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(note);
});

app.put("/api/notes/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return fail(res, 400, "Некорректный идентификатор заметки.");
  const validationError = validateNote(req.body || {});
  if (validationError) return fail(res, 400, validationError);
  const result = db.prepare(`
    UPDATE notes SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND author_id = ?
  `).run(req.body.title.trim(), req.body.description.trim(), id, req.session.userId);
  if (!result.changes) return fail(res, 404, "Заметка не найдена или недоступна для редактирования.");
  res.json(db.prepare("SELECT id, title, description, author_id, created_at, updated_at FROM notes WHERE id = ?").get(id));
});

app.delete("/api/notes/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return fail(res, 400, "Некорректный идентификатор заметки.");
  const result = db.prepare("DELETE FROM notes WHERE id = ? AND author_id = ?").run(id, req.session.userId);
  if (!result.changes) return fail(res, 404, "Заметка не найдена или недоступна для удаления.");
  res.json({ message: "Заметка удалена." });
});


// Совместимые маршруты /api/tasks для задания CRUD из модуля №3.
// Они используют ту же таблицу и правила доступа, что и пользовательские заметки.
app.get("/api/tasks", (req, res) => {
  const tasks = db.prepare(`
    SELECT notes.id, notes.title, notes.description, notes.author_id,
           notes.created_at, notes.updated_at, users.name AS author
    FROM notes JOIN users ON users.id = notes.author_id
    ORDER BY notes.updated_at DESC, notes.id DESC
  `).all();
  res.json(tasks);
});

app.post("/api/tasks", requireAuth, (req, res) => {
  const validationError = validateNote(req.body || {});
  if (validationError) return fail(res, 400, validationError);
  const result = db.prepare(
    "INSERT INTO notes (title, description, author_id) VALUES (?, ?, ?)"
  ).run(req.body.title.trim(), req.body.description.trim(), req.session.userId);
  const task = db.prepare(
    "SELECT id, title, description, author_id, created_at, updated_at FROM notes WHERE id = ?"
  ).get(result.lastInsertRowid);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return fail(res, 400, "Некорректный идентификатор задачи.");
  const validationError = validateNote(req.body || {});
  if (validationError) return fail(res, 400, validationError);
  const result = db.prepare(`
    UPDATE notes SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND author_id = ?
  `).run(req.body.title.trim(), req.body.description.trim(), id, req.session.userId);
  if (!result.changes) return fail(res, 404, "Задача не найдена или недоступна для редактирования.");
  res.json(db.prepare(
    "SELECT id, title, description, author_id, created_at, updated_at FROM notes WHERE id = ?"
  ).get(id));
});

app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return fail(res, 400, "Некорректный идентификатор задачи.");
  const result = db.prepare("DELETE FROM notes WHERE id = ? AND author_id = ?").run(id, req.session.userId);
  if (!result.changes) return fail(res, 404, "Задача не найдена или недоступна для удаления.");
  res.json({ message: "Задача удалена." });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  fail(res, 500, "Внутренняя ошибка сервера.");
});

module.exports = app;
