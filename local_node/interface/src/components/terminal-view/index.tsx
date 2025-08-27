import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { CanvasAddon } from "@xterm/addon-canvas";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
// import { AttachAddon } from '@xterm/addon-attach';


type WS = WebSocket;

interface Props {
  id: string;
  ws: WS;
  active?: boolean;
  promptText?: string; // 默认: "$ "
}

export default function TerminalView({
  id,
  ws,
  active = false,
  promptText = "$ ",
}: Props) {
  const wsRef = useRef<WebSocket | null>(ws);
  const termRef = useRef<HTMLDivElement | null>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  // 输入缓冲 & 历史
  const inputBuffer = useRef<string>(""); // 当前输入行
  const history = useRef<string[]>([]); // 历史命令
  const historyIndex = useRef<number>(-1);

  const showPrompt = () => {
    terminal.current?.write(promptText);
  };

  const redrawInput = () => {
    // 回到行首，清除整行（CSI 2K），再写提示符与当前缓冲
    const term = terminal.current;
    if (!term) return;
    term.write("\r\x1b[2K");
    term.write(promptText);
    term.write(inputBuffer.current);
  };

  // 保持 wsRef 最新
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

  // 初始化 xterm
  useEffect(() => {
    if (!termRef.current || terminal.current) return;

    const term = new Terminal({
      allowProposedApi: true,
      convertEol: true, // 关键：将 \n 当作 \r\n 处理，避免错位
      fontSize: 12,
      fontFamily: "JetBrains Mono, Menlo, monospace",
      lineHeight: 1,
      letterSpacing: -0.25,
      cursorBlink: true,
      cursorStyle: "bar",
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
      },
    });
    terminal.current = term;

    const fit = new FitAddon();
    fitAddon.current = fit;
    term.loadAddon(fit);
    term.loadAddon(new ClipboardAddon());
    term.loadAddon(new SearchAddon());
    term.loadAddon(new Unicode11Addon());
    term.loadAddon(new WebLinksAddon());

    try {
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
    } catch (err) {
      console.warn("WebGL addon init failed, fallback to Canvas:", err);
      term.loadAddon(new CanvasAddon());
    }

    term.open(termRef.current);
    fit.fit();

    // 初始提示符
    showPrompt();

    // 输入处理（行缓冲）
    const onData = (input: string) => {
      switch (input) {
        case "\r": { // Enter
          const command = inputBuffer.current.trim();

          if (command === "clear") {
            // 使用 ANSI 序列清屏并移动光标到左上角，然后显示提示符
            term.write("\x1b[2J\x1b[3J\x1b[H");
            inputBuffer.current = "";
            showPrompt();
            break;
          }

          // 普通命令：换行 -> 发送 -> 记录历史；不立即显示新提示符，等待 exit 事件
          term.write("\r\n");
          if (command) {
            wsRef.current?.send(
              JSON.stringify({
                id,
                type: "terminal",
                data: { cmd: "sh", args: ["-lc", command] },
              })
            );
            history.current.push(command);
            historyIndex.current = history.current.length;
          }
          inputBuffer.current = "";
          break;
        }

        case "\u007F": { // Backspace
          if (inputBuffer.current.length > 0) {
            inputBuffer.current = inputBuffer.current.slice(0, -1);
            // 回退一格、擦掉字符、再回退一格
            term.write("\b \b");
          }
          break;
        }

        case "\u001b[A": { // Up (history prev)
          if (history.current.length > 0 && historyIndex.current > 0) {
            historyIndex.current--;
            inputBuffer.current = history.current[historyIndex.current];
          }
          redrawInput();
          break;
        }
        case "\u001b[B": { // Down (history next)
          if (history.current.length > 0 && historyIndex.current < history.current.length - 1) {
            historyIndex.current++;
            inputBuffer.current = history.current[historyIndex.current];
          } else {
            inputBuffer.current = "";
          }
          redrawInput();
          break;
        }

        default: { // 普通字符
          inputBuffer.current += input;
          terminal.current?.write(input);
        }
      }
    };

    term.onData(onData);

    const onResize = () => {
      fitAddon.current?.fit();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      terminal.current = null;
      fitAddon.current = null;
    };
  }, [promptText, id]);

  // 监听后端消息（按 id 路由）
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.id !== id) return;

        const t = msg.type as string;
        // 兼容两种事件命名：stdout/stderr/exit 与 terminal.*
        if (t === "stdout" || t === "terminal.stdout") {
          terminal.current?.write(String(msg.data ?? "").replace(/\n/g, "\r\n"));
        } else if (t === "stderr" || t === "terminal.stderr") {
          terminal.current?.write(String(msg.data ?? "").replace(/\n/g, "\r\n"));
        } else if (t === "exit" || t === "terminal.exit") {
          const code = msg.data?.code ?? 0;
          if (code && Number(code) !== 0) {
            terminal.current?.writeln(`\r\n[process exited: ${code}]`);
          }
          // 命令执行完成后在当前行显示新的提示符
          showPrompt();
        }
      } catch {
        // ignore
      }
    };
    ws.addEventListener("message", onMsg);
    return () => ws.removeEventListener("message", onMsg);
  }, [id, ws]);

  // 激活时聚焦 & 适配
  useEffect(() => {
    if (active) {
      terminal.current?.focus();
      fitAddon.current?.fit();
    }
  }, [active]);

  return (
    <div
      ref={termRef}
      className={`${active ? "block" : "hidden"} h-full w-full`}
    />
  );
}
