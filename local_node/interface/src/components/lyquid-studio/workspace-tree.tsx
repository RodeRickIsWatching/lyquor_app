import { Tree, NodeApi } from "react-arborist";
import { useMemo, useRef } from "react";
import type { FileNode } from "@/stores/workspace-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
    ChevronDown,
    ChevronRight,
    File,
    Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function FileIcon({ node, n }: { node: NodeApi<FileNode>, n: FileNode }) {
    if (n.type === "folder") {
        return (
            <div>
                {node.isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </div>
        )
    }
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
    const { selectedId } = useWorkspaceStore()
    if (node.isEditing) {
        return (
            <div className="h-[22px]">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem(
                            "name"
                        ) as HTMLInputElement | null;
                        node.submit(input?.value ?? node?.data.name);
                    }}
                >
                    <input
                        name="name"
                        autoFocus
                        defaultValue={node?.data?.name}
                        onBlur={() => node.reset()}
                        style={{ width: "90%" }}
                    />
                </form>
            </div>
        );
    }

    return (
        <div
            className={cn("hover:dark:bg-white/5 hover:bg-black/5 h-[22px]", selectedId == node.id ? "!bg-black/10 dark:!bg-white/10" : "")}
            style={{ ...style, display: "flex", alignItems: "center", gap: 6 }}
            ref={dragHandle}
            onClick={(e) => {
                node.handleClick(e);
                if (node.isInternal) {
                    node.toggle()
                }
            }}
            title={node.data.name}
        >
            <FileIcon node={node} n={node.data} />
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



const handleActivate = (n: NodeApi<FileNode>) => {
    useWorkspaceStore.getState().selectFile(n?.data);
}

export default function WorkspaceTree() {
    const rootRef = useRef<any | undefined>(undefined)
    const tempSelected = useRef<any>(undefined)
    const { tree, onCreate, onMove, onRename, onDelete } =
        useWorkspaceStore();

    const dims = useMemo(() => ({ width: "100%" as const, height: 600 }), []);

    const handleCreateFile = () => {
        rootRef.current.createLeaf()
    }
    const handleCreateFoler = () => {
        rootRef.current.createInternal()
    }
    return (
        <div className="px-2 text-sm relative group">
            <div className="opacity-0 group-hover:opacity-100 z-1 absolute top-2 right-2 flex items-center">
                <Button onClick={handleCreateFile} className="w-fit h-fit !p-1 text-gray-500" variant="ghost"><File className="size-3" /></Button>
                <Button onClick={handleCreateFoler} className="w-fit h-fit !p-1 text-gray-500" variant="ghost"><Folder className="size-3" /></Button>
            </div>
            <Tree<FileNode>
                openByDefault={false}
                ref={rootRef}
                padding={8}
                data={tree}
                width={dims.width}
                height={dims.height}
                indent={18}
                rowHeight={22}
                onCreate={onCreate}
                onMove={onMove}
                onRename={onRename}
                onDelete={onDelete}
                onSelect={(ns) => {
                    const n = ns?.[0]
                    handleActivate(n);
                    tempSelected.current = n;
                }}
            >
                {NodeRenderer}
            </Tree>
        </div>
    );
}
