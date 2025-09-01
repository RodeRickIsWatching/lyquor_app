// /server/dispatcher/editor_dispatch.ts
import { promises as fs } from "fs";
import * as path from "path";
import type { LyquorEvent } from "../../interface";
import { scanDirectory } from "../../utils/scanDirectory.ts";
import { fileURLToPath } from "url";
import pkg from "node-7z";
const { extractFull } = pkg;

// ===== 配置：所有 workspace 的根目录 =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACES_ROOT = path.resolve(__dirname, "../../lyquid-editor-workspace");
const TEMPLATE_ZIP = path.resolve(__dirname, "../../ldk-template.7z");


// ====== 公共类型 ======
export type FileTreeNode = {
  type: "file" | "folder";
  name: string;      // 基名
  path: string;      // 相对 namespace 根目录的路径（用 / 分隔）
  children?: FileTreeNode[];
};

// ====== 协议：事件与负载 ======
export type EditorEventType =
  | "tree:get"
  | "file:read" | "file:write" | "file:create" | "file:delete" | "file:rename"
  | "folder:create" | "folder:delete" | "folder:rename";

export interface EditorEventPayloads {
  "tree:get": { namespace: string };

  "file:read": { namespace: string; path: string };
  "file:write": { namespace: string; path: string; content: string };
  "file:create": { namespace: string; path: string; content?: string };
  "file:delete": { namespace: string; path: string };
  "file:rename": { namespace: string; oldPath: string; newPath: string };

  "folder:create": { namespace: string; path: string };
  "folder:delete": { namespace: string; path: string };
  "folder:rename": { namespace: string; oldPath: string; newPath: string };
}

type Handler<T> = (data: T, sink: (evt: LyquorEvent) => void) => Promise<void> | void;

type EditorDispatcherMap = {
  [K in EditorEventType]: { handler: Handler<EditorEventPayloads[K]> };
};

// ====== 工具函数 ======
async function ensureNamespaceDir(namespace: string): Promise<string> {
  const nsRoot = path.join(WORKSPACES_ROOT, namespace);
  await fs.mkdir(nsRoot, { recursive: true });
  return nsRoot;
}

/** 规范化并校验相对路径，防止目录穿越 */
function resolveNsPath(nsRoot: string, rel: string): string {
  const trimmed = (rel || "").replace(/^[/\\]+/, ""); // 去掉开头的 / \
  const abs = path.resolve(nsRoot, trimmed);
  const nsRootWithSep = nsRoot.endsWith(path.sep) ? nsRoot : nsRoot + path.sep;
  if (!abs.startsWith(nsRootWithSep)) {
    throw new Error("Path escapes namespace root");
  }
  return abs;
}

async function pathIsDirectory(absPath: string): Promise<boolean> {
  const s = await fs.lstat(absPath);
  return s.isDirectory();
}

async function isDirEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    // 如果要忽略噪声文件可在这里过滤 .DS_Store / .gitkeep 等
    return entries.length === 0;
  } catch (e: any) {
    if (e.code === "ENOENT") return true; // 目录不存在 → 视为“空”
    throw e;
  }
}


async function extractTemplate7z(zipPath: string, destPath: string) {
  return new Promise<void>((resolve, reject) => {
    const stream = extractFull(zipPath, destPath, { $bin: "7z" }); // 用系统的 7z
    stream.on("end", () => resolve());
    stream.on("error", (err: Error) => reject(err));
  });
}

// ====== Dispatcher 实现 ======
export const editorDispatcherMap: EditorDispatcherMap = {
  // -- Tree
  "tree:get": {
    handler: async (data, sink) => {
      const workspaceDir = await ensureNamespaceDir(data.namespace);

      // 如果 workspace 不存在，先拷贝模板
      if (await isDirEmpty(workspaceDir)) {
        await fs.mkdir(workspaceDir, { recursive: true });
        await extractTemplate7z(TEMPLATE_ZIP, workspaceDir);
      }

      // 扫描 workspace
      const tree = await scanDirectory(workspaceDir);

      sink({
        type: "tree:get:ok",
        data: { namespace: data.namespace, tree },
      });
    },
  },

  // -- File
  "file:read": {
    handler: async ({ namespace, path: rel }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const abs = resolveNsPath(nsRoot, rel);
        if (await pathIsDirectory(abs)) {
          throw new Error("Target is a directory");
        }
        const content = await fs.readFile(abs, "utf-8");
        sink({ type: "file:read:ok", data: { namespace, path: rel, content } });
      } catch (err: any) {
        sink({ type: "file:read:error", data: { namespace, path: rel, message: err?.message || String(err) } });
      }
    },
  },

  "file:write": {
    handler: async ({ namespace, path: rel, content }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const abs = resolveNsPath(nsRoot, rel);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, content, "utf-8");
        sink({ type: "file:write:ok", data: { namespace, path: rel } });
      } catch (err: any) {
        sink({ type: "file:write:error", data: { namespace, path: rel, message: err?.message || String(err) } });
      }
    },
  },

  "file:create": {
    handler: async ({ namespace, path: rel, content = "" }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const abs = resolveNsPath(nsRoot, rel);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        // 'wx' 确保文件不存在时才创建
        await fs.writeFile(abs, content, { encoding: "utf-8", flag: "wx" });
        sink({ type: "file:create:ok", data: { namespace, path: rel } });
      } catch (err: any) {
        sink({ type: "file:create:error", data: { namespace, path: rel, message: err?.message || String(err) } });
      }
    },
  },

  "file:delete": {
    handler: async ({ namespace, path: rel }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const abs = resolveNsPath(nsRoot, rel);
        if (await pathIsDirectory(abs)) {
          throw new Error("Target is a directory; use folder:delete");
        }
        await fs.unlink(abs);
        sink({ type: "file:delete:ok", data: { namespace, path: rel } });
      } catch (err: any) {
        sink({ type: "file:delete:error", data: { namespace, path: rel, message: err?.message || String(err) } });
      }
    },
  },

  "file:rename": {
    handler: async ({ namespace, oldPath, newPath }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const absOld = resolveNsPath(nsRoot, oldPath);
        const absNew = resolveNsPath(nsRoot, newPath);
        await fs.mkdir(path.dirname(absNew), { recursive: true });
        await fs.rename(absOld, absNew);
        sink({ type: "file:rename:ok", data: { namespace, oldPath, newPath } });
      } catch (err: any) {
        sink({ type: "file:rename:error", data: { namespace, oldPath, newPath, message: err?.message || String(err) } });
      }
    },
  },

  // -- Folder
  "folder:create": {
    handler: async ({ namespace, path: rel }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const abs = resolveNsPath(nsRoot, rel);
        await fs.mkdir(abs, { recursive: true });
        sink({ type: "folder:create:ok", data: { namespace, path: rel } });
      } catch (err: any) {
        sink({ type: "folder:create:error", data: { namespace, path: rel, message: err?.message || String(err) } });
      }
    },
  },

  "folder:delete": {
    handler: async ({ namespace, path: rel }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const abs = resolveNsPath(nsRoot, rel);
        await fs.rm(abs, { recursive: true, force: true });
        sink({ type: "folder:delete:ok", data: { namespace, path: rel } });
      } catch (err: any) {
        sink({ type: "folder:delete:error", data: { namespace, path: rel, message: err?.message || String(err) } });
      }
    },
  },

  "folder:rename": {
    handler: async ({ namespace, oldPath, newPath }, sink) => {
      try {
        const nsRoot = await ensureNamespaceDir(namespace);
        const absOld = resolveNsPath(nsRoot, oldPath);
        const absNew = resolveNsPath(nsRoot, newPath);
        await fs.mkdir(path.dirname(absNew), { recursive: true });
        await fs.rename(absOld, absNew);
        sink({ type: "folder:rename:ok", data: { namespace, oldPath, newPath } });
      } catch (err: any) {
        sink({ type: "folder:rename:error", data: { namespace, oldPath, newPath, message: err?.message || String(err) } });
      }
    },
  },
} as const;

// ====== 入口：类型安全的分发函数 ======
export function editor_dispatch<T extends EditorEventType>(
  type: T,
  data: EditorEventPayloads[T],
  sink: (evt: LyquorEvent) => void
) {
  const entry = editorDispatcherMap[type];
  if (!entry) {
    sink({ type: "error", data: `Unknown type: ${type}` });
    return;
  }
  try {
    const res = entry.handler(data as any, sink);
    if (res instanceof Promise) {
      res.catch((err: any) => {
        sink({ type: `${type}:error`, data: { ...(data as any), message: err?.message || String(err) } });
      });
    }
  } catch (err: any) {
    sink({ type: `${type}:error`, data: { ...(data as any), message: err?.message || String(err) } });
  }
}
