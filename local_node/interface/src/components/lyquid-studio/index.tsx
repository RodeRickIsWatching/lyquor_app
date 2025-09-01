import React, { useRef } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dock, Trash2, Save, Play, Rocket } from "lucide-react";
import TerminalView from "@/components/terminal-view";
import { useThemeStore } from "@/stores/theme-store";
import { terminalTestnetWs } from "@/constants";
import { cn } from "@/lib/utils";
import WorkspaceEditor from "@/components/lyquid-studio/workspace-editor";
import WorkspaceTree from "@/components/lyquid-studio/workspace-tree";
import { useWorkspaceStore } from "@/stores/workspace-store";

const terminalWs = new WebSocket(terminalTestnetWs);
type Layout = "bottom" | "right";
const TERM_ID = "lyquid-studio-term";

// ---- 发命令到终端 ----
function execToTerminal(cmd: string, submit = true) {
  window.dispatchEvent(
    new CustomEvent("exec_cmd", { detail: { id: TERM_ID, cmd, submit } })
  );
}

// ---- 把编辑器里的代码写入工作目录 ----
function buildWriteFileCmd(
  workspace: string,
  filename: string,
  content: string
) {
  return `
WS="${workspace}"
mkdir -p "$WS/src"
cat > "$WS/src/${filename}" <<'__RS__'
${content}
__RS__
echo "✅ Wrote: $WS/src/${filename}"
`.trim();
}

function buildCompileCmd(workspace: string) {
  return `
WS="${workspace}"
cd "$WS"
cargo build --release
`.trim();
}

function buildDeployCmd(workspace: string, contractName = "Contract") {
  return `
WS="${workspace}"
cd "$WS"
echo "🚀 (示例) 部署 ${contractName} …"
`.trim();
}

export const LyquidStudio = ({ lyquid_id }: { lyquid_id?: string }) => {
  const { theme } = useThemeStore();
  const { selectedFile: activeFile } = useWorkspaceStore()
  const code = activeFile?.content || ""

  // 终端停靠方向
  const [layout, setLayout] = React.useState<Layout>("right");
  const [hovered, setHovered] = React.useState(false);

  const workspace = React.useMemo(
    () => `~/lyquor/workspaces/${lyquid_id ?? "workspace"}`,
    [lyquid_id]
  );

  const handleSave = React.useCallback(() => {
    if (!activeFile) return;
    const cmd = buildWriteFileCmd(workspace, activeFile.name, code);
    execToTerminal(cmd, true);
  }, [workspace, activeFile, code]);

  const handleCompile = React.useCallback(() => {
    if (!activeFile) return;
    const save = buildWriteFileCmd(workspace, activeFile.name, code);
    const build = buildCompileCmd(workspace);
    execToTerminal(`${save}\n${build}`, true);
  }, [workspace, activeFile, code]);

  const handleDeploy = React.useCallback(() => {
    if (!activeFile) return;
    const save = buildWriteFileCmd(workspace, activeFile.name, code);
    const build = buildCompileCmd(workspace);
    const deploy = buildDeployCmd(workspace, activeFile.name);
    execToTerminal(`${save}\n${build}\n${deploy}`, true);
  }, [workspace, activeFile, code]);

  const clearTerminal = React.useCallback(() => {
    execToTerminal("clear", true);
  }, []);

  return (
    <Card className="flex flex-col overflow-hidden pb-0 gap-0">
      <CardHeader className="flex flex-row justify-between items-center pb-6">
        <div />
        <div className="flex gap-2">
          <Button
            className="text-xs"
            size="sm"
            variant="outline"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button
            className="text-xs"
            size="sm"
            variant="outline"
            onClick={handleCompile}
          >
            <Play className="w-4 h-4 mr-1" /> Compile
          </Button>
          <Button className="text-xs" size="sm" onClick={handleDeploy}>
            <Rocket className="w-4 h-4 mr-1" /> Deploy
          </Button>
        </div>
      </CardHeader>
      <Separator />

      <PanelGroup
        key={layout}
        direction={layout === "bottom" ? "vertical" : "horizontal"}
        className="flex-1"
      >
        <Panel defaultSize={5}>
          <CardContent className="p-0 h-full flex items-center">
            <>
              <PanelGroup
                key={layout}
                direction={"horizontal"}
                className="flex-1"
              >
                <Panel defaultSize={1}>
                  <WorkspaceTree />
                </Panel>
                <PanelResizeHandle className="w-1 bg-muted hover:bg-muted-foreground/50 cursor-col-resize" />
                <Panel defaultSize={5}>
                  <WorkspaceEditor />
                </Panel>
              </PanelGroup>
            </>
          </CardContent>
        </Panel>
        {layout == "bottom" ? (
          <PanelResizeHandle className="h-1 bg-muted hover:bg-muted-foreground/50 cursor-row-resize" />
        ) : (
          <PanelResizeHandle className="w-1 bg-muted hover:bg-muted-foreground/50 cursor-col-resize" />
        )}
        <Panel defaultSize={1}>
          <div
            className={cn(
              "relative h-full",
              theme == "light" ? "bg-white" : "bg-[#1e1e1e]"
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {hovered && (
              <div className="absolute top-1 right-1 z-10 flex gap-1 p-1 rounded">
                <Button
                  size="icon"
                  className="h-fit w-fit !p-1"
                  variant="ghost"
                  onClick={() =>
                    setLayout(layout === "bottom" ? "right" : "bottom")
                  }
                  title="Dock Right"
                >
                  <Dock className="size-3 min-size-3" />
                </Button>
                <Button
                  size="icon"
                  className="h-fit w-fit !p-1"
                  variant="ghost"
                  onClick={clearTerminal}
                  title="Clear"
                >
                  <Trash2 className="size-3 min-size-3" />
                </Button>
              </div>
            )}
            <TerminalView id={TERM_ID} ws={terminalWs} active />
          </div>
        </Panel>
      </PanelGroup>
    </Card>
  );
};
