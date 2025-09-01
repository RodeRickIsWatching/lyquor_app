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
      <div className="h-full flex flex-col justify-center items-center text-gray-500">
        <svg
          className="size-10"
          width="346"
          height="312"
          viewBox="0 0 346 312"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M341.576 90.0496C346.023 86.5138 346.335 79.8693 342.238 75.9333L297.195 32.659C293.032 28.6598 286.28 29.3298 282.985 34.0691L218.37 126.994C214.076 133.169 204.38 129.59 205.128 122.107L216.53 8.03623C217.183 1.50622 209.551 -2.49478 204.552 1.75643L152.447 46.0634C148.252 49.6304 145.835 54.859 145.835 60.3652V103.11C145.835 108.969 139.275 112.435 134.435 109.134L45.2347 48.2909C39.2431 44.204 31.0158 47.4058 29.3628 54.4677L17.1141 106.797C15.3712 114.243 19.6765 121.77 26.9781 124.044L84.7082 142.016C90.2902 143.754 91.6595 151.025 87.092 154.675L3.77869 221.237C-0.652981 224.777 -0.955882 231.409 3.13459 235.339L48.1957 278.631C52.3583 282.63 59.1102 281.96 62.4056 277.221L127.021 184.296C131.314 178.121 141.01 181.7 140.262 189.183L128.86 303.254C128.207 309.784 135.839 313.785 140.839 309.534L192.944 265.227C197.138 261.66 199.556 256.431 199.556 250.925V208.18C199.556 202.321 206.116 198.855 210.955 202.156L300.156 262.999C306.147 267.086 314.375 263.884 316.028 256.822L328.279 204.484C330.021 197.042 325.721 189.517 318.425 187.24L260.411 169.133C254.825 167.389 253.466 160.107 258.046 156.465L341.576 90.0496Z"
            fill="currentColor"
          />
        </svg>
        <div>Start Now!</div>
      </div>
    );
  }

  const language = file.name.endsWith(".toml")
    ? "ini"
    : file.name.endsWith(".rs")
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
      language={language}
      value={file.content ?? ""}
      onChange={(v) => update(file.id, v ?? "")}
      options={{ fontSize: 12, minimap: { enabled: false } }}
      theme={theme == "light" ? "light" : "vs-dark"}
    />
  );
}
