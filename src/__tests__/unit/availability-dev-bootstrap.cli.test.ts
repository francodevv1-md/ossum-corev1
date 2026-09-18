import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../../..");
const temporaryDirectories: string[] = [];

function quoteShellArgument(value: string) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("availability DEV bootstrap CLI", () => {
  it("loads .env and then .env.local before evaluating static imports", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ossum-availability-cli-"));
    temporaryDirectories.push(directory);

    const baseEnvPath = path.join(directory, ".env");
    const localEnvPath = path.join(directory, ".env.local");
    const assertionPath = path.join(directory, "assert-env.mjs");
    const probePath = path.join(directory, "probe.mjs");

    writeFileSync(baseEnvPath, "DATABASE_URL=postgresql://base\nOSSUM_ENV_BASE_ONLY=base\n");
    writeFileSync(localEnvPath, "DATABASE_URL=postgresql://local\n");
    writeFileSync(
      assertionPath,
      [
        'if (process.env.DATABASE_URL !== "postgresql://local") throw new Error("local precedence missing");',
        'if (process.env.OSSUM_ENV_BASE_ONLY !== "base") throw new Error("base env missing");',
      ].join("\n")
    );
    writeFileSync(probePath, 'import "./assert-env.mjs";\nconsole.log("env-ready");\n');

    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const advertisedCommand = packageJson.scripts["dev:bootstrap:availability"];
    const probeCommand = advertisedCommand
      .replace("--env-file=.env.local", `--env-file=${quoteShellArgument(localEnvPath)}`)
      .replace("--env-file=.env", `--env-file=${quoteShellArgument(baseEnvPath)}`)
      .replace("scripts/dev/bootstrap-availability.ts", quoteShellArgument(probePath));

    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.OSSUM_ENV_BASE_ONLY;

    const result = spawnSync(probeCommand, {
      cwd: projectRoot,
      encoding: "utf8",
      env,
      shell: true,
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("env-ready");
  });
});
