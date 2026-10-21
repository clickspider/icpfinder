import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = "2.1.258";
const integrity = {
  arm64: "9gYzEZjYLY/3N49jkgk9BeXPGDQNCE/6pO3/tFHJP054YnXCvKcyjWbx1M5ISgiKnEtmTRDXnAX4cXe1SGZ+Eg==",
  x64: "risc/t2M1dka64gZz/tWhnjpOZpWO30M8sMoMSMLoDvuzghInsF8Ur5fV3M1J3N19RQzhOoVkSIghpqi/XuuOg==",
};

// Download at build time, never on the user's first launch. Pinned bytes; no npm scripts.
async function prepareClaude(arch = process.arch) {
  if (!integrity[arch]) throw new Error(`Unsupported Mac architecture: ${arch}`);
  const destination = join(root, "resources/runtime", arch);
  try {
    await access(join(destination, "claude"));
    const { readFile } = await import("node:fs/promises");
    if ((await readFile(join(destination, "version"), "utf8")) === version) return;
  } catch {
    /* A fresh checkout needs the runtime. */
  }
  const temp = await mkdtemp(join(tmpdir(), "icpfinder-runtime-"));
  try {
    console.log(`Preparing bundled Claude ${version} for ${arch}…`);
    const response = await fetch(
      `https://registry.npmjs.org/@anthropic-ai/claude-code-darwin-${arch}/-/claude-code-darwin-${arch}-${version}.tgz`
    );
    if (!response.ok) throw new Error(`Claude runtime download failed (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash("sha512").update(bytes).digest("base64") !== integrity[arch])
      throw new Error("Claude runtime checksum mismatch");
    const archive = join(temp, "runtime.tgz");
    await writeFile(archive, bytes);
    execFileSync("tar", ["-xzf", archive, "-C", temp, "package/claude", "package/LICENSE.md"]);
    await mkdir(destination, { recursive: true });
    await copyFile(join(temp, "package/claude"), join(destination, "claude.tmp"));
    await chmod(join(destination, "claude.tmp"), 0o755);
    await rename(join(destination, "claude.tmp"), join(destination, "claude"));
    await copyFile(join(temp, "package/LICENSE.md"), join(destination, "LICENSE.md"));
    await writeFile(join(destination, "version"), version);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

async function prepareCodex(arch) {
  const version = "0.163.0";
  const checksums = {
    arm64:
      "i7Dzk2a5aGmuGM9aNZgaUVTojZ/4bc5lRfosz++Y7X2BGhDkz+cySgbD+NYS1pOxfm0VEbLi9PZ3pAulI4kchw==",
    x64: "Ioj7h+B1ME9ZU1PH1ATfvFV5DiototEpFFaSSbg3kfDifB9djhl5fcJ++g5mpcL/+uVbcnReei+RiSXEx8o+kw==",
  };
  if (!checksums[arch]) throw new Error(`Unsupported Mac architecture: ${arch}`);
  const destination = join(root, "resources/runtime", arch, "codex");
  try {
    await access(join(destination, "bin/codex"));
    if ((await readFile(join(destination, "version"), "utf8")) === version) return;
  } catch {
    /* Download the pinned app runtime. */
  }
  const temp = await mkdtemp(join(tmpdir(), "icpfinder-codex-"));
  try {
    console.log(`Preparing bundled Codex ${version} for ${arch}…`);
    const response = await fetch(
      `https://registry.npmjs.org/@openai/codex/-/codex-${version}-darwin-${arch}.tgz`
    );
    if (!response.ok) throw new Error(`Codex runtime download failed (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash("sha512").update(bytes).digest("base64") !== checksums[arch])
      throw new Error("Codex runtime checksum mismatch");
    const archive = join(temp, "runtime.tgz");
    await writeFile(archive, bytes);
    const member = `package/vendor/${arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`;
    execFileSync("tar", ["-xzf", archive, "-C", temp, member]);
    await mkdir(destination, { recursive: true });
    await cp(join(temp, member), destination, { recursive: true });
    await chmod(join(destination, "bin/codex"), 0o755);
    await writeFile(join(destination, "version"), version);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
export async function prepareRuntime(arch = process.arch) {
  await prepareClaude(arch);
  await prepareCodex(arch);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await prepareRuntime();
