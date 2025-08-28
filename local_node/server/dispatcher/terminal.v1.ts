import { spawn } from 'child_process'

import type { LyquorEvent } from '../interface/index.ts'

let devnetProcess: ReturnType<typeof spawn> | null = null

// 为每个终端维护一个持久的 shell 会话
const terminalSessions = new Map<string, {
  process: ReturnType<typeof spawn>
  stdin: NodeJS.WritableStream
}>()

export function handleTerminal(
  data: { cmd: string; args?: string[]; id: string },
  emit: (evt: LyquorEvent) => void
): void {
  if (!data?.cmd || !data?.id) {
    emit({ type: 'error', data: 'Missing cmd or id' })
    return
  }
  
  const { cmd, args = [], id } = data
  
  // 检查是否已有会话
  let session = terminalSessions.get(id)
  
  if (!session) {
    // 创建新的 shell 会话
    const shellProcess = spawn('sh', ['-i'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      cwd: process.cwd(),
    })
    
    session = {
      process: shellProcess,
      stdin: shellProcess.stdin
    }
    
    terminalSessions.set(id, session)
    
    // 设置输出监听
    shellProcess.stdout.on('data', (d) => 
      emit({ type: 'terminal.stdout', data: d.toString() })
    )
    shellProcess.stderr.on('data', (d) => 
      emit({ type: 'terminal.stderr', data: d.toString() })
    )
    shellProcess.on('error', (err) => 
      emit({ type: 'error', data: err.message })
    )
    shellProcess.on('close', (code) => {
      emit({ type: 'terminal.exit', data: { code } })
      terminalSessions.delete(id)
    })
    
    // 发送启动确认
    emit({ type: 'terminal.started', data: { id } })
  }

  if (args[1] === "__terminate__") {
    session.stdin.write('\x03');
    cleanupTerminal(id)
    emit({ type: 'terminal.terminated', data: { id } })
    return
  }

  if (args[1] === "__interrupt__") {
    // session.process.kill('SIGINT')
    session.stdin.write('\x03');
    emit({ type: 'terminal.interrupt', data: { id } })
    return
  }

  session.stdin.write(args[1]+ '\n')

  
  // 向现有会话发送命令
  try {
    session.stdin.write(cmd + '\n')
  } catch (err) {
    emit({ type: 'error', data: `Failed to write to terminal: ${err}` })
  }
}

// 清理终端会话
export function cleanupTerminal(id: string): void {
  const session = terminalSessions.get(id)
  if (session) {
    session.process.kill('SIGTERM')
    terminalSessions.delete(id)
  }
}

// 清理所有终端会话
export function cleanupAllTerminals(): void {
  for (const [id, session] of terminalSessions) {
    session.process.kill('SIGTERM')
  }
  terminalSessions.clear()
}

export function handleStdin(input: string) {
  if (devnetProcess && devnetProcess?.stdin?.writable) {
    devnetProcess.stdin.write(input)
  }
}
