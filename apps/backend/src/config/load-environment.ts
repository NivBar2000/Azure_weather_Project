import { loadEnvFile } from "node:process";
import { join } from "node:path";

export function loadEnvironmentFile(): void {
  try {
    loadEnvFile(join(__dirname, "..", "..", ".env"));
  } catch (error: unknown) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
