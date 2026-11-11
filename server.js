"use strict";

const app = require("./app");
const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`SIDE B is listening on port ${port}`);
});
