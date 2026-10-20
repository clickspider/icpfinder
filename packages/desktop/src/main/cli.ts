// SPDX-License-Identifier: MIT
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

/** Do not let inherited API billing or custom endpoints override a subscription. */
export function subscriptionEnv(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...source };
  for (const key of Object.keys(env)) {
    if (key === "CODEX_HOME") continue;
    if (
      /^(ANTHROPIC|OPENAI|CODEX|CLAUDE|XAI|GROK)(_|$)/i.test(key) ||
      /^(CLAUDECODE|NODE_OPTIONS|NODE_EXTRA_CA_CERTS|BASH_ENV|ENV|LD_PRELOAD|DYLD_INSERT_LIBRARIES)$/.test(
        key
      )
    )
      delete env[key];
  }
  return env;
}

export async function resolveCli(name: "claude" | "codex"): Promise<string | null> {
  if (name !== "claude" && name !== "codex") return null;
  const relative = name === "claude" ? "claude" : "codex/bin/codex";
  const bundled = [
    ...(process.resourcesPath ? [join(process.resourcesPath, "runtime", relative)] : []),
    join(__dirname, "../../resources/runtime", process.arch, relative),
  ];
  const candidates = [
    ...bundled,
    ...(process.env.PATH ?? "")
      .split(":")
      .filter(Boolean)
      .map((dir) => join(dir, name)),
  ];
  candidates.push(
    join(homedir(), ".local/bin", name),
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`
  );
  if (name === "codex")
    candidates.push(
      "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
      "/Applications/Codex.app/Contents/Resources/codex"
    );
  for (const candidate of candidates) {
    if (!isAbsolute(candidate)) continue;
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* Try next installation. */
    }
  }
  const shell = ["/bin/zsh", "/bin/bash", "/bin/sh"].includes(process.env.SHELL ?? "")
    ? (process.env.SHELL ?? "/bin/zsh")
    : "/bin/zsh";
  const found = await new Promise<string | null>((resolve) => {
    execFile(
      shell,
      ["-lc", `command -v ${name}`],
      { env: subscriptionEnv(), timeout: 5000, maxBuffer: 8192 },
      (error, stdout) => {
        const path = stdout.trim().split("\n").at(-1);
        resolve(!error && path && isAbsolute(path) ? path : null);
      }
    );
  });
  if (found) {
    try {
      await access(found, constants.X_OK);
      return found;
    } catch {
      /* Unavailable executable. */
    }
  }
  return null;
}
