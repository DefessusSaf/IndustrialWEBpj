"use strict";

const express = require("express");
const path = require("path");

const app = express();
const info = {
  name: "SIDE B",
  description: "Независимый музыкальный портал о внимательном слушании.",
  version: "2.0.0",
  module: "Git CI and Docker"
};

app.disable("x-powered-by");
app.use(express.static(__dirname));

app.get("/api/status", (req, res) => {
  res.json({
    status: "success",
    message: "Сервер SIDE B работает",
    containerized: process.env.CONTAINERIZED === "true",
    version: info.version
  });
});

app.get("/api/info", (req, res) => {
  res.json(info);
});

module.exports = app;
