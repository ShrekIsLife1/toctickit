import { app } from "./app.js";

// Safety net: log unexpected errors instead of letting the process crash.
// A crashed server is worse than a logged error for this course's local-dev
// scope (e.g. a malformed request body should never take down the whole app).
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server stayed alive):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (server stayed alive):", err);
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`TokTickIT API listening on http://localhost:${PORT}`);
});
