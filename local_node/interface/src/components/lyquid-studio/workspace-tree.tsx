import { Tree, NodeApi } from "react-arborist";
import { useMemo } from "react";
import type { FileNode } from "@/stores/workspace-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  ChevronDown,
  ChevronUp,
  File,
} from "lucide-react";

function FileIcon({ n }: { n: FileNode }) {
  if (n.type === "folder")
    return (
      <div>
        {n.children && n.children.length ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
      </div>
    );
  return <File className="size-3" />;
}

function NodeRenderer({
  node,
  style,
  dragHandle,
}: {
  node: NodeApi<FileNode>;
  style: React.CSSProperties;
  dragHandle?: (el: HTMLDivElement | null) => void;
}) {
  // 内联重命名：自定义渲染器必须自己渲染输入框（对齐文档）
  if (node.isEditing) {
    return (
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(
              "name"
            ) as HTMLInputElement | null;
            node.submit(input?.value ?? node.data.name);
          }}
        >
          <input
            name="name"
            autoFocus
            defaultValue={node.data.name}
            onBlur={() => node.reset()}
            style={{ width: "90%" }}
          />
        </form>
      </div>
    );
  }

  return (
    <div
      style={{ ...style, display: "flex", alignItems: "center", gap: 6 }}
      ref={dragHandle}
      onClick={(e) => node.handleClick(e)}
      onDoubleClick={() => (node.isInternal ? node.toggle() : null)}
      title={node.data.name}
    >
      <FileIcon n={node.data} />
      <span
        style={{
          userSelect: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {node.data.name}
      </span>
    </div>
  );
}

export default function WorkspaceTree() {
  const { tree, onCreate, onMove, onRename, onDelete, selectFile } =
    useWorkspaceStore();

  // 让 Tree 尺寸响应父容器
  const dims = useMemo(() => ({ width: "100%" as const, height: 600 }), []);

  return (
    <div className="px-2 text-sm">
      <Tree<FileNode>
        padding={8}
        data={tree}
        openByDefault
        width={dims.width}
        height={dims.height}
        indent={18}
        rowHeight={28}
        // 受控模式四件套（签名为对象）
        onCreate={onCreate}
        onMove={onMove}
        onRename={onRename}
        onDelete={onDelete}
        // 选择/激活
        onActivate={(n) => {
          if (n.data.type === "file") selectFile(n.id);
        }}
        disableDrop={({ parentNode }) =>
          parentNode ? parentNode.isLeaf : false
        }
      >
        {NodeRenderer}
      </Tree>
    </div>
  );
}
