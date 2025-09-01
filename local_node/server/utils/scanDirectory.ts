import fs from "fs";
import path from "path";

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
};

/**
 * 扫描目录并生成 FileNode 树
 * @param dir 扫描的根目录
 * @param rootPath 用于生成相对 id
 */
export function scanDirectory(
  dir: string,
  rootPath: string = dir
): FileNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      return {
        id: relativePath,
        name: entry.name,
        type: "folder",
        children: scanDirectory(fullPath, rootPath),
      };
    } else {
      return {
        id: relativePath,
        name: entry.name,
        type: "file",
      };
    }
  });
}
