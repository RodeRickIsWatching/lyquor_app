import { spawn } from 'child_process'
import type { LyquorEvent } from '../interface/index.ts'

let devnetProcess: ReturnType<typeof spawn> | null = null

export function handleTerminal(
  data: { cmd: string; args?: string[] },
  emit: (evt: LyquorEvent) => void
): void {
  if (!data?.cmd) {
    emit({ type: 'error', data: 'Missing cmd' })
    return
  }
  const { cmd, args = [] } = data

  const proc = spawn(cmd, args, { shell: false })

  proc.stdout.on('data', (d) => emit({ type: 'stdout', data: d.toString() }))
  proc.stderr.on('data', (d) => emit({ type: 'stderr', data: d.toString() }))
  proc.on('error', (err) => emit({ type: 'error', data: err.message }))
  proc.on('close', (code) => emit({ type: 'exit', data: { code } }))
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
