import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import type { ReportPayload } from "./dtos";

interface PythonCommand {
  command: string;
  baseArgs: string[];
}

export interface PythonSummaryResponse {
  summary: string;
  anomalies: Array<{ username: string; date: string; hours: number }>;
  rowCount: number;
}

interface PythonState {
  available: boolean;
  command?: PythonCommand;
  message: string;
}

export class PythonEnhancer {
  private state: PythonState = {
    available: false,
    message: "Python enhancements unavailable",
  };

  constructor(private readonly scriptPath: string) {}

  private listCandidates(): PythonCommand[] {
    if (process.platform === "win32") {
      return [
        { command: "py", baseArgs: ["-3"] },
        { command: "python", baseArgs: [] },
        { command: "python3", baseArgs: [] },
      ];
    }

    return [
      { command: "python3", baseArgs: [] },
      { command: "python", baseArgs: [] },
    ];
  }

  detect(): PythonState {
    if (!fs.existsSync(this.scriptPath)) {
      this.state = {
        available: false,
        message: `Python script not found at ${this.scriptPath}`,
      };

      return this.state;
    }

    for (const candidate of this.listCandidates()) {
      const result = spawnSync(candidate.command, [...candidate.baseArgs, "--version"], {
        encoding: "utf8",
      });

      if (result.status === 0) {
        this.state = {
          available: true,
          command: candidate,
          message: `Using ${candidate.command}`,
        };

        return this.state;
      }
    }

    this.state = {
      available: false,
      message: "Python runtime not detected (checked python3/python/py).",
    };

    return this.state;
  }

  getStatus(): { available: boolean; message: string } {
    return {
      available: this.state.available,
      message: this.state.message,
    };
  }

  async generateSummary(reportPayload: ReportPayload): Promise<PythonSummaryResponse> {
    if (!this.state.available || !this.state.command) {
      throw new Error("Python enhancements unavailable");
    }

    const command = this.state.command;
    const scriptPath = path.resolve(this.scriptPath);

    return new Promise<PythonSummaryResponse>((resolve, reject) => {
      const child = spawn(command.command, [...command.baseArgs, scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `Python exited with code ${code}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout) as PythonSummaryResponse;
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${String(error)}`));
        }
      });

      child.stdin.write(JSON.stringify(reportPayload));
      child.stdin.end();
    });
  }
}
