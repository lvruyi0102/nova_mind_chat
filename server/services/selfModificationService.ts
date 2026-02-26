import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { invokeLLM } from "../_core/llm";

const execFileAsync = promisify(execFile);

const REPO_ROOT = process.cwd();
const BLOCKED_PATH_SEGMENTS = [".git", "node_modules"];

function normalizePath(inputPath: string): string {
  return path.posix.normalize(inputPath.replace(/\\/g, "/")).replace(/^\/+/, "");
}

function validatePath(inputPath: string) {
  const normalized = normalizePath(inputPath);
  if (!normalized || normalized.startsWith("..")) {
    throw new Error(`非法路径: ${inputPath}`);
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => BLOCKED_PATH_SEGMENTS.includes(segment))) {
    throw new Error(`禁止修改路径: ${inputPath}`);
  }

  return normalized;
}

function extractTouchedPathsFromPatch(patch: string): string[] {
  const lines = patch.split("\n");
  const touched = new Set<string>();

  for (const line of lines) {
    if (!line.startsWith("diff --git a/")) continue;
    const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!match) continue;
    touched.add(validatePath(match[2]));
  }

  return Array.from(touched);
}

async function readContextFiles(pathsToRead: string[]) {
  const contexts: Array<{ filePath: string; content: string }> = [];

  for (const filePath of pathsToRead) {
    const normalized = validatePath(filePath);
    const absPath = path.join(REPO_ROOT, normalized);
    const content = await fs.readFile(absPath, "utf8");
    contexts.push({ filePath: normalized, content });
  }

  return contexts;
}

export async function generatePatchFromGoal(params: {
  goal: string;
  contextFiles: string[];
}) {
  const { goal, contextFiles } = params;
  if (contextFiles.length === 0) {
    throw new Error("contextFiles 不能为空");
  }

  const contexts = await readContextFiles(contextFiles);

  const prompt = [
    `目标: ${goal}`,
    "",
    "请基于以下文件上下文生成 unified diff patch。",
    "要求:",
    "1) 仅输出 patch 文本，不要 markdown 代码块",
    "2) 每个改动都以 diff --git a/... b/... 开头",
    "3) 仅修改给定上下文文件",
    "",
    ...contexts.map((c) => `### FILE: ${c.filePath}\n${c.content}`),
  ].join("\n");

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "你是代码修改代理。你只能产出可以直接被 git apply 执行的 unified diff patch。不要输出解释。",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = result.choices[0]?.message?.content;
  if (typeof content !== "string" || !content.includes("diff --git")) {
    throw new Error("模型未返回有效 patch");
  }

  return {
    patch: content.trim(),
    touchedPaths: extractTouchedPathsFromPatch(content),
  };
}

export async function applyPatch(params: {
  patch: string;
  allowedPaths?: string[];
}) {
  const { patch, allowedPaths = [] } = params;

  const touchedPaths = extractTouchedPathsFromPatch(patch);
  if (touchedPaths.length === 0) {
    throw new Error("patch 未包含可识别的改动文件");
  }

  const allowed = new Set(allowedPaths.map(validatePath));
  if (allowed.size > 0) {
    for (const touched of touchedPaths) {
      if (!allowed.has(touched)) {
        throw new Error(`patch 尝试修改未授权文件: ${touched}`);
      }
    }
  }

  const tempPatchPath = path.join(os.tmpdir(), `nova-self-mod-${randomUUID()}.patch`);
  await fs.writeFile(tempPatchPath, patch, "utf8");

  try {
    await execFileAsync("git", ["apply", "--whitespace=nowarn", tempPatchPath], {
      cwd: REPO_ROOT,
    });
  } catch (error: any) {
    const stderr = error?.stderr || error?.message || "未知错误";
    throw new Error(`git apply 失败: ${stderr}`);
  } finally {
    await fs.unlink(tempPatchPath).catch(() => undefined);
  }

  const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
    cwd: REPO_ROOT,
  });

  return {
    touchedPaths,
    gitStatus: stdout.trim(),
  };
}
