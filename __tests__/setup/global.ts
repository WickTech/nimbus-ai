import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const SUFFIXES = ["", "-journal", "-wal", "-shm"];

/**
 * Creates an empty SQLite database with the current Prisma schema before the tests and removes it after.
 * The file is brand new (named after this process), so a plain `db push` is enough: nothing is reset or
 * overwritten, and the safety check below makes sure it can never point at anything outside the temp folder.
 */
export default function setup() {
  const file = process.env.NIMBUS_TEST_DB;
  if (!file) throw new Error("NIMBUS_TEST_DB is not set (see vitest.config.ts)");
  if (!resolve(file).startsWith(resolve(tmpdir()) + "/")) {
    throw new Error(`Refusing to use a test database outside the temp folder: ${file}`);
  }

  for (const suffix of SUFFIXES) rmSync(file + suffix, { force: true });
  try {
    execFileSync("npx", ["prisma", "db", "push", "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: `file:${file}` },
      stdio: "pipe",
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(`prisma db push failed for the test database:\n${stderr}`);
  }

  return () => {
    for (const suffix of SUFFIXES) rmSync(file + suffix, { force: true });
  };
}
