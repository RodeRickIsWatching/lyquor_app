import Editor from "@monaco-editor/react";
import { useMemo } from "react";
import { useThemeStore } from "@/stores/theme-store";
import type { FileNode } from "@/stores/workspace-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

function findById(
  nodes: FileNode[],
  id: string | undefined
): FileNode | undefined {
  if (!id) return undefined;
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return n;
    if (Array.isArray(n.children)) stack.push(...n.children);
  }
  return undefined;
}

export default function WorkspaceEditor() {
  const { theme } = useThemeStore();
  const tree = useWorkspaceStore((s) => s.tree);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const update = useWorkspaceStore((s) => s.updateFileContent);

  const file = useMemo(() => findById(tree, selectedId), [tree, selectedId]);

  if (!file || file.type !== "file") {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        请选择一个文件
      </div>
    );
  }

  const language =
    file.name.endsWith(".toml") || file.name.endsWith(".rs")
      ? "rust"
      : file.name.endsWith(".ts") || file.name.endsWith(".tsx")
      ? "typescript"
      : file.name.endsWith(".js") || file.name.endsWith(".jsx")
      ? "javascript"
      : file.name.endsWith(".json")
      ? "json"
      : file.name.endsWith(".css")
      ? "css"
      : "plaintext";

  return (
    <Editor
      height="100%"
      path={file.name}
      defaultLanguage={language}
      value={file.content ?? ""}
      onChange={(v) => update(file.id, v ?? "")}
      options={{ fontSize: 12, minimap: { enabled: false } }}
      theme={theme == "light" ? "light" : "vs-dark"}
    />
  );
}
