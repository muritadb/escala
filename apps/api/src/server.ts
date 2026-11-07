import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const development = process.env.COMPASSO_DEV === "1";
const port = Number(process.env.COMPASSO_PORT ?? (development ? 5175 : 5174));
const app = createApp({
  dbPath:
    process.env.COMPASSO_DB_PATH ??
    fileURLToPath(new URL("../data/compasso.sqlite", import.meta.url)),
  webRoot: development
    ? undefined
    : fileURLToPath(new URL("../../web/dist", import.meta.url)),
  origins: [5174, port].flatMap((value) => [
    "http://localhost:" + value,
    "http://127.0.0.1:" + value,
  ]),
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void app.close());
}

console.log("Compasso em " + (await app.listen({ host: "127.0.0.1", port })));
