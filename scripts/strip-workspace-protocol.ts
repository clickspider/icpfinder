// Rewrite `workspace:*`/`workspace:^`/`workspace:~` deps in publishable
// package.json files to real semver ranges before `changeset publish` runs.
//
// Background: Changesets calls `npm publish`, which does NOT strip the
// `workspace:` protocol (pnpm and bun do this at pack time, but npm pack
// does not). Without this script the published tarball would ship
// `"@icpfinder/providers": "workspace:*"` literally and consumers would
// hit `EUNSUPPORTEDPROTOCOL` on install. Bun in dev still resolves the
// workspace symlink because we keep `workspace:*` in the source tree —
// this script only mutates the on-disk package.json long enough for
// `npm pack` to capture the rewritten range.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publishable = ["core", "providers"];

const versions: Record<string, string> = {};
for (const dir of publishable) {
  const p = JSON.parse(
    fs.readFileSync(path.join(root, "packages", dir, "package.json"), "utf8"),
  );
  versions[p.name] = p.version;
}

for (const dir of publishable) {
  const pkgPath = path.join(root, "packages", dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  let changed = false;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== "string" || !range.startsWith("workspace:")) continue;
      const target = versions[name];
      if (!target) {
        throw new Error(
          `${pkg.name} depends on ${name} via ${range}, but ${name} is not a publishable workspace package`,
        );
      }
      const protocol = range.slice("workspace:".length);
      let newRange: string;
      if (protocol === "*" || protocol === "^") newRange = `^${target}`;
      else if (protocol === "~") newRange = `~${target}`;
      else newRange = protocol;
      deps[name] = newRange;
      changed = true;
      console.log(`${pkg.name}: ${field}.${name} ${range} -> ${newRange}`);
    }
  }
  if (changed) {
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}
