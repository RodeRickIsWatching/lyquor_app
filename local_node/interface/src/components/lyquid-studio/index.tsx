// components/lyquid-studio.tsx
import React, { useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dock, Trash2, Save, Play, Rocket } from "lucide-react";
import TerminalView from "@/components/terminal-view"; // 用你之前给的可输入终端
import { useThemeStore } from "@/stores/theme-store";
import { terminalTestnetWs } from "@/constants";
import { cn } from "@/lib/utils";
// 可选：shadcn Input/Label 如果后续要自定义路径
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

const terminalWs = new WebSocket(terminalTestnetWs)
type Layout = "bottom" | "right";

const TERM_ID = "lyquid-studio-term";
// ---- 发命令到终端（TerminalView 内置监听 'exec_cmd'）----
function execToTerminal(cmd: string, submit = true) {
  window.dispatchEvent(
    new CustomEvent("exec_cmd", { detail: { id: TERM_ID, cmd, submit } })
  );
}

// ---- 把编辑器里的代码写入工作目录（纯终端方式，无需额外 API）----
function buildWriteFileCmd(
  workspace: string,
  filename: string,
  content: string
) {
  // 使用 heredoc，避免转义地狱；workspace/src/Contract.sol
  return `
WS="${workspace}"
mkdir -p "$WS/src"
cat > "$WS/src/${filename}" <<'__SOL__'
${content}
__SOL__
echo "✅ Wrote: $WS/src/${filename}"
`.trim();
}

// ---- 默认：Foundry 编译（演示）----
function buildCompileCmd(workspace: string) {
  return `
WS="${workspace}"
cd "$WS"
# 初始化一次（存在就跳过）
if [ ! -f "foundry.toml" ]; then
  forge init -q . --no-commit --force
  mkdir -p src
fi
forge build
`.trim();
}

// ---- 示例部署（占位：按你实际 lyquor/shaker 环境替换）----
function buildDeployCmd(workspace: string, contractName = "Contract") {
  // 这里仅示意：你可以替换为 shaker/cast/forge create 的真实命令
  return `
WS="${workspace}"
cd "$WS"
echo "🚀 (示例) 部署 ${contractName} …（请替换为真实 command）"
# 例如：forge create --private-key $PK src/${contractName}.sol:${contractName}
`.trim();
}

export const LyquidStudio = ({ lyquid_id }: { lyquid_id?: string }) => {
  const { theme } = useThemeStore()
  const editorRef = useRef<any>(null)

  // 单文件编辑：默认一个 ERC20 片段
  const [code, setCode] = React.useState<string>(
    `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contract {
    string public name = "Demo";
}`
  );

  // 终端停靠方向（bottom/right）
  const [layout, setLayout] = React.useState<Layout>("right");
  const [hovered, setHovered] = React.useState(false);

  // 工作目录/文件名（单文件模式）
  const workspace = React.useMemo(
    () => `~/lyquor/workspaces/${lyquid_id ?? "workspace"}`,
    [lyquid_id]
  );
  const fileName = "Contract.sol";
  const contractName = "Contract";

  const handleSave = React.useCallback(() => {
    const cmd = buildWriteFileCmd(workspace, fileName, code);
    execToTerminal(cmd, true);
  }, [workspace, fileName, code]);

  const handleCompile = React.useCallback(() => {
    // 先保存，再编译（用 && 串起来）
    const save = buildWriteFileCmd(workspace, fileName, code);
    const build = buildCompileCmd(workspace);
    execToTerminal(`${save}\n${build}`, true);
  }, [workspace, fileName, code]);

  const handleDeploy = React.useCallback(() => {
    // 先保存 & 编译，再部署（示例命令，按需替换）
    const save = buildWriteFileCmd(workspace, fileName, code);
    const build = buildCompileCmd(workspace);
    const deploy = buildDeployCmd(workspace, contractName);
    execToTerminal(`${save}\n${build}\n${deploy}`, true);
  }, [workspace, fileName, code]);

  const clearTerminal = React.useCallback(() => {
    execToTerminal("clear", true);
  }, []);

  return (
    <Card className="flex flex-col overflow-hidden pb-0 gap-0">
      <CardHeader className="flex flex-row justify-between items-center pb-6">
        <div />
        <div className="flex gap-2">
          <Button className="text-xs" size="sm" variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button className="text-xs" size="sm" variant="outline" onClick={handleCompile}>
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
        <Panel defaultSize={3}>
          <CardContent className="p-0 h-full">
            <Editor
              onMount={(editor) => { editorRef.current = editor }}
              defaultLanguage="rust"
              value={code}
              theme={theme == 'light' ? "light" : "vs-dark"}
              onChange={(val) => setCode(val ?? "")}
              options={{
                fontSize: 13,
                minimap: { enabled: true },
                scrollBeyondLastLine: true,
                automaticLayout: true,
              }}
            />
          </CardContent>
        </Panel>
        {layout == "bottom" ? <PanelResizeHandle className="h-1 bg-muted hover:bg-muted-foreground/50 cursor-row-resize" /> : <PanelResizeHandle className="w-1 bg-muted hover:bg-muted-foreground/50 cursor-col-resize" />}
        <Panel defaultSize={1}>
          <div
            className={cn("relative h-full", theme == 'light' ? 'bg-white' : 'bg-[#1e1e1e]')}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {hovered && (
              <div className="absolute top-1 right-1 z-10 flex gap-1 p-1 rounded">
                <Button
                  size="icon"
                  className="h-fit w-fit !p-1"
                  variant="ghost"
                  onClick={() => {
                    setLayout(layout === "bottom" ? "right" : "bottom")
                  }}
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
