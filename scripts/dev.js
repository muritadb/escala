import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const tsc = fileURLToPath(new URL("node_modules/typescript/bin/tsc", root));
const vite = fileURLToPath(new URL("node_modules/vite/bin/vite.js", root));

function launch(workspace, args, env = process.env) {
  return spawn(process.execPath, args, {
    cwd: new URL(workspace + "/", root),
    stdio: "inherit",
    env,
  });
}

for (const workspace of ["packages/domain", "apps/api"]) {
  const [status] = await once(launch(workspace, [tsc]), "exit");
  if (status !== 0) process.exit(status ?? 1);
}

const children = [
  launch("packages/domain", [tsc, "--watch", "--preserveWatchOutput"]),
  launch("apps/api", [tsc, "--watch", "--preserveWatchOutput"]),
  launch("apps/api", ["--watch", "dist/server.js"], {
    ...process.env,
    COMPASSO_DEV: "1",
  }),
  launch("apps/web", [vite]),
];

function stop(status) {
  process.exitCode ??= status;
  for (const child of children) child.kill();
}

for (const child of children) {
  child.once("exit", (status) => stop(status ?? 1));
  child.once("error", (error) => {
    console.error(error);
    stop(1);
  });
}
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
