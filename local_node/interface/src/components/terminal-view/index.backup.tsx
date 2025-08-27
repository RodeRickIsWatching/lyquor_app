import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { ClipboardAddon } from '@xterm/addon-clipboard'
import { SearchAddon } from '@xterm/addon-search'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

function App() {
  const wsRef = useRef<WebSocket | null>(null)
  const termRef = useRef<HTMLDivElement | null>(null)
  const terminal = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)

  const inputBuffer = useRef<string>('') // 当前输入行
  const history = useRef<string[]>([])   // 历史命令
  const historyIndex = useRef<number>(-1)

  const prompt = () => {
    terminal.current?.write('\r\n$ ')
  }

  useEffect(() => {
    if (termRef.current && !terminal.current) {
      terminal.current = new Terminal({
        allowProposedApi: true,
        convertEol: false,
        fontSize: 12,
          fontFamily: 'JetBrains Mono, Menlo, monospace',

        lineHeight: 1,
        cursorBlink: true,
        cursorStyle: 'bar',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
        },
      })

      // === 加载 addon ===
      fitAddon.current = new FitAddon()
      terminal.current.loadAddon(fitAddon.current)
      terminal.current.loadAddon(new ClipboardAddon())
      terminal.current.loadAddon(new SearchAddon())
      terminal.current.loadAddon(new Unicode11Addon())
      terminal.current.loadAddon(new WebLinksAddon())

      try {
        const webgl = new WebglAddon()
        terminal.current.loadAddon(webgl)
      } catch (err) {
        console.warn('WebGL addon init failed, fallback to Canvas:', err)
        terminal.current.loadAddon(new CanvasAddon())
      }

      terminal.current.open(termRef.current)
      fitAddon.current.fit()

      // 初始提示符
      terminal.current.write('$ ')

      // 捕获用户输入
      terminal.current.onData((input) => {
        switch (input) {
          case '\r': { // Enter
            const command = inputBuffer.current.trim()
            terminal.current?.writeln('') // 换行
            if (command) {
              if (command === 'clear') {
                terminal.current?.clear()
              } else {
                wsRef.current?.send(JSON.stringify({ id: Date.now(), type: 'stdin', data: command }))
              }
              history.current.push(command)
              historyIndex.current = history.current.length
            }
            inputBuffer.current = ''
            prompt()
            break
          }

          case '\u007F': // Backspace
            if (inputBuffer.current.length > 0) {
              inputBuffer.current = inputBuffer.current.slice(0, -1)
              terminal.current?.write('\b \b')
            }
            break

          case '\u001b[A': // Up arrow
            if (history.current.length > 0 && historyIndex.current > 0) {
              historyIndex.current--
              clearLine()
              inputBuffer.current = history.current[historyIndex.current]
              terminal.current?.write(inputBuffer.current)
            }
            break

          case '\u001b[B': // Down arrow
            if (history.current.length > 0 && historyIndex.current < history.current.length - 1) {
              historyIndex.current++
              clearLine()
              inputBuffer.current = history.current[historyIndex.current]
              terminal.current?.write(inputBuffer.current)
            } else {
              // 到最底，清空输入
              clearLine()
              inputBuffer.current = ''
            }
            break

          default: // 普通字符
            inputBuffer.current += input
            terminal.current?.write(input)
        }
      })

      // 清除当前行并重新打印提示符
      const clearLine = () => {
        terminal.current?.write('\r')
        terminal.current?.write('$ ' + ' '.repeat(inputBuffer.current.length))
        terminal.current?.write('\r$ ')
      }

      window.addEventListener('resize', () => {
        fitAddon.current?.fit()
      })
    }

    // 初始化 WebSocket
    const ws = new WebSocket('ws://localhost:9527/ws')
    wsRef.current = ws

    ws.onopen = () => {
      terminal.current?.writeln('\r\n✅ WebSocket connected')
      terminal.current?.write('$ ')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg?.type === 'stdout' || msg?.type === 'stderr') {
          terminal.current?.write(msg.data)
        } else {
          terminal.current?.writeln(`📩 ${event.data}`)
        }
      } catch {
        terminal.current?.writeln(event.data)
      }
      terminal.current?.write('\r\n$ ')
    }

    ws.onclose = () => {
      terminal.current?.writeln('\r\n❌ WebSocket closed')
    }

    return () => {
      ws.close()
    }
  }, [])

  const startDevnet = () => {
    wsRef.current?.send(JSON.stringify({ id: Date.now(), type: 'start-devnet', data: null }))
  }

  const stopDevnet = () => {
    wsRef.current?.send(JSON.stringify({ id: Date.now(), type: 'stop-devnet', data: null }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#1e1e1e' }}>
      <div style={{ textAlign: 'right', padding: '6px 10px', background: '#2d2d2d' }}>
        <button onClick={startDevnet} style={{ marginRight: 10 }}>▶ 启动 Devnet</button>
        <button onClick={stopDevnet}>■ 停止 Devnet</button>
      </div>
      <div ref={termRef} style={{ flex: 1, padding: '12px', border: '1px solid #fff' }} />
    </div>
  )
}

export default App
