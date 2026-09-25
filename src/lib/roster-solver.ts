import { spawn } from "node:child_process";
import path from "node:path";
import type { ShiftInput } from "@/lib/roster-core";

export async function solveRoster(candidates: string[], shifts: ShiftInput[]): Promise<Record<string, string[]>> {
  const python = process.env.ORTOOLS_PYTHON || "python";
  const script = path.join(process.cwd(), "solver", "solve.py");
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let output = "";
    let errors = "";
    const timer = setTimeout(() => child.kill(), 30_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { errors += chunk.toString(); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(errors || "排班求解器未成功运行"));
      else {
        try { resolve(JSON.parse(output) as Record<string, string[]>); }
        catch { reject(new Error("排班求解器输出无效")); }
      }
    });
    child.stdin.end(JSON.stringify({ candidates, shifts }));
  });
}
