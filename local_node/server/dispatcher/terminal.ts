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

/**
 * 启动本地 Devnet
 */
export function handleDevnet(emit: (evt: LyquorEvent) => void): void {
  if (devnetProcess) {
    emit({ type: 'error', data: 'Devnet 已经在运行' })
    return
  }

  const binPath = `${process.env.HOME}/.shakenup/bin/start-devnet`

  devnetProcess = spawn(binPath, [], {
    env: process.env,
    cwd: process.env.HOME,
    shell: true, // 用 shell 避免 PATH 找不到
  })
  if(!devnetProcess?.stdout || !devnetProcess?.stderr) return;

  devnetProcess.stdout.on('data', (d) =>
    emit({ type: 'stdout', data: d.toString() })
  )
  devnetProcess.stderr.on('data', (d) =>
    emit({ type: 'stderr', data: d.toString() })
  )
  devnetProcess.on('error', (err) =>
    emit({ type: 'error', data: err.message })
  )
  devnetProcess.on('close', (code) => {
    emit({ type: 'exit', data: { code } })
    devnetProcess = null
  })
}

/**
 * 停止 Devnet
 */
export function stopDevnet(emit: (evt: LyquorEvent) => void): void {
  if (!devnetProcess) {
    emit({ type: 'error', data: 'Devnet 未运行' })
    return
  }
  devnetProcess.kill('SIGTERM')
  devnetProcess = null
  emit({ type: 'info', data: 'Devnet 已停止' })
}
