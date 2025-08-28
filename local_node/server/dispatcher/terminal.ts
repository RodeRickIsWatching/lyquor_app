import pty from "node-pty";
import type { LyquorEvent } from "../interface";

interface Session {
  process: pty.IPty;
}

const terminalSessions = new Map<string, Session>();

export function handleTerminal(
  data: { cmd: string; args?: string[]; id: string },
  emit: (evt: LyquorEvent) => void
): void {
  if (!data?.cmd || !data?.id) {
    emit({ type: "error", data: "Missing cmd or id" });
    return;
  }

  const { args = [], id } = data;

  const realCmd = args?.[1]
  if (!realCmd) return;

  let session = terminalSessions.get(id);

  if (!session) {
    // 启动一个伪终端会话
    const shell = process.env.SHELL || "bash";

    const shellProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env,
    });

    session = { process: shellProcess };
    terminalSessions.set(id, session);

    // 监听输出
    shellProcess.onData((d: string) => {
      emit({ type: "terminal.stdout", data: d });
    });

    // 退出
    shellProcess.onExit((e) => {
      emit({ type: "terminal.exit", data: { code: e.exitCode } });
      terminalSessions.delete(id);
    });

    emit({ type: "terminal.started", data: { id } });
  }

  // 内置控制指令
  if (realCmd === "__terminate__") {
    session.process.kill("SIGTERM");
    emit({ type: "terminal.terminated", data: { id } });
    terminalSessions.delete(id);
    return;
  }

  if (realCmd === "__interrupt__") {
    session.process.write('\x03');   // 用 node-pty 的 write，而不是 stdin.write
    emit({ type: 'terminal.interrupt', data: { id } });
    return;
  }

  // 普通输入
  if (realCmd) {
    session.process.write(realCmd + "\r");
  }
}
