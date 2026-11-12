"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let app;
let server;
let baseUrl;
let tempDir;

test.before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "side-b-tests-"));
  process.env.DB_PATH = path.join(tempDir, "test.db");
  process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.COOKIE_SECURE = "false";
  app = require("./app");
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test("SIDE B: pages, authentication, session protection and notes CRUD", async () => {
  const request = (url, options = {}, cookie) => fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {})
    }
  });

  const status = await request("/api/status");
  assert.equal(status.status, 200);
  const statusData = await status.json();
  assert.equal(statusData.status, "success");
  assert.equal(statusData.version, "2.0.0");

  const info = await request("/api/info");
  assert.equal(info.status, 200);
  const infoData = await info.json();
  assert.equal(infoData.name, "SIDE B");
  assert.equal(infoData.module, "Git CI/CD and Docker");

  const home = await request("/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /SIDE B/);

  const accountPage = await request("/account.html");
  assert.equal(accountPage.status, 200);
  assert.equal((await request("/app.js")).status, 404);
  assert.equal((await request("/package.json")).status, 404);

  const unauthenticatedMe = await request("/api/me");
  assert.equal(unauthenticatedMe.status, 401);

  const blockedCreate = await request("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "Private note", description: "Should be blocked" })
  });
  assert.equal(blockedCreate.status, 401);

  const registration = await request("/api/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "Test12345",
      passwordConfirm: "Test12345"
    })
  });
  assert.equal(registration.status, 201);

  const duplicate = await request("/api/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "Test12345",
      passwordConfirm: "Test12345"
    })
  });
  assert.equal(duplicate.status, 409);

  const login = await request("/api/login", {
    method: "POST",
    body: JSON.stringify({ email: "test@example.com", password: "Test12345" })
  });
  assert.equal(login.status, 200);
  const cookieHeader = login.headers.get("set-cookie");
  assert.ok(cookieHeader, "login must issue a session cookie");
  const cookie = cookieHeader.split(";")[0];

  const me = await request("/api/me", {}, cookie);
  assert.equal(me.status, 200);
  assert.equal((await me.json()).email, "test@example.com");

  const created = await request("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "First note", description: "Created by test" })
  }, cookie);
  assert.equal(created.status, 201);
  const note = await created.json();

  const list = await request("/api/notes");
  assert.equal(list.status, 200);
  assert.equal((await list.json()).length, 1);

  const updated = await request(`/api/notes/${note.id}`, {
    method: "PUT",
    body: JSON.stringify({ title: "Updated note", description: "Updated by test" })
  }, cookie);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).title, "Updated note");

  const deleted = await request(`/api/notes/${note.id}`, { method: "DELETE" }, cookie);
  assert.equal(deleted.status, 200);
  assert.equal((await request("/api/notes")).status, 200);
  assert.deepEqual(await (await request("/api/notes")).json(), []);

  const taskCreated = await request("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title: "CRUD task", description: "Module 3 task endpoint" })
  }, cookie);
  assert.equal(taskCreated.status, 201);
  const task = await taskCreated.json();

  const tasksList = await request("/api/tasks");
  assert.equal((await tasksList.json()).length, 1);

  const taskUpdated = await request(`/api/tasks/${task.id}`, {
    method: "PUT",
    body: JSON.stringify({ title: "Updated CRUD task", description: "Updated" })
  }, cookie);
  assert.equal(taskUpdated.status, 200);
  assert.equal((await taskUpdated.json()).title, "Updated CRUD task");

  const taskDeleted = await request(`/api/tasks/${task.id}`, { method: "DELETE" }, cookie);
  assert.equal(taskDeleted.status, 200);
  assert.deepEqual(await (await request("/api/tasks")).json(), []);

  const logout = await request("/api/logout", { method: "POST", body: "{}" }, cookie);
  assert.equal(logout.status, 200);
  assert.equal((await request("/api/me", {}, cookie)).status, 401);
});

test.after(async () => {
  if (server) await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});
