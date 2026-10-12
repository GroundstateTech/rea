#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dependencyInstallProblems } from "./check-dependency-install.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);

function run(command, args, preparation = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    // Preparation must not contaminate MCP stdout or CLI JSON output.
    stdio: preparation ? ["inherit", 2, 2] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function npm(args) {
  // Only fixed install/build commands enter cmd.exe. User CLI arguments are
  // passed directly to Node below, never through a shell.
  if (process.platform === "win32") {
    run("cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], true);
  } else {
    run("npm", args, true);
  }
}

try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (
    !(
      (major === 22 && minor >= 19) ||
      (major === 24 && minor >= 11) ||
      major >= 26
    )
  ) {
    throw new Error(
      `Node ${process.versions.node} is unsupported. Install Node 22.19+ (22.x), 24.11+ (24.x), or 26+ from https://nodejs.org/`,
    );
  }
  const fingerprint = createHash("sha256")
    .update(readFileSync("package.json"))
    .update(readFileSync("package-lock.json"))
    .update(`${process.versions.node}:${process.platform}:${process.arch}`)
    .digest("hex");
  const marker = "node_modules/.rea-launcher-install";
  let installed = false;
  try {
    installed =
      existsSync(marker) &&
      readFileSync(marker, "utf8") === fingerprint &&
      dependencyInstallProblems(
        JSON.parse(readFileSync("package-lock.json", "utf8")),
        JSON.parse(readFileSync("node_modules/.package-lock.json", "utf8")),
      ).length === 0;
  } catch {
    // A missing or damaged dependency tree is repaired with a locked install.
  }
  if (!installed) {
    console.error(
      "Installing REA's locked dependencies. First run needs internet...",
    );
    npm(["ci"]);
    writeFileSync(marker, fingerprint);
  }
  // The repository owns build invalidation and artifact locking. Always ask
  // its cached build to refresh changed source before invoking the dispatcher.
  npm(["run", "build:cached"]);
  const args = process.argv.slice(2);
  run(process.execPath, [
    fileURLToPath(new URL("./rea.mjs", import.meta.url)),
    ...(args.length === 0 ? ["setup"] : args),
  ]);
} catch (error) {
  console.error(`REA could not start: ${error.message}`);
  process.exitCode = 1;
}
