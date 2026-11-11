"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("./app");

let server;
let baseUrl;

test.before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("GET /api/status returns a healthy service status", async () => {
  const response = await fetch(`${baseUrl}/api/status`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "success");
  assert.equal(data.version, "2.0.0");
});

test("GET /api/info returns portal information", async () => {
  const response = await fetch(`${baseUrl}/api/info`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.name, "SIDE B");
  assert.equal(data.module, "Git CI and Docker");
});

test("GET / serves the music portal", async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /SIDE B/);
});
