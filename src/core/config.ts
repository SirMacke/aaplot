import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import envPaths from "env-paths";

export const API_KEY_ENV_VAR = "AA_API_KEY";

const CONFIG_FILE_NAME = "config.json";

export interface ConfigPaths {
  config: string;
  cache: string;
  data: string;
}

export function getConfigPaths(): ConfigPaths {
  const paths = envPaths("aaplot");
  return { config: paths.config, cache: paths.cache, data: paths.data };
}

interface ConfigFile {
  api_key?: string;
}

export class KeyStore {
  private readonly env: NodeJS.ProcessEnv;

  constructor(
    private readonly configDir: string,
    env: NodeJS.ProcessEnv = process.env,
  ) {
    this.env = env;
  }

  private get filePath(): string {
    return path.join(this.configDir, CONFIG_FILE_NAME);
  }

  async read(): Promise<string | null> {
    const fromEnv = this.env[API_KEY_ENV_VAR];
    if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
    try {
      const config = JSON.parse(await readFile(this.filePath, "utf8")) as ConfigFile;
      return typeof config?.api_key === "string" && config.api_key !== "" ? config.api_key : null;
    } catch {
      return null;
    }
  }

  async write(apiKey: string): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify({ api_key: apiKey }, null, 2)}\n`);
    if (process.platform !== "win32") {
      await chmod(this.filePath, 0o600);
    }
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
  }
}
