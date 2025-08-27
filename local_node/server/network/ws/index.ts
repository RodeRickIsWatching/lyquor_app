import { lyquor_dispatch } from '../../dispatcher/index.ts'
import type { LyquorEvent, LyquorRequest } from '../../interface/index.ts'
import type { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'

/**
 * 将 WebSocket 服务器挂载到现有的 HTTP 服务器上
 * 这样可以共享同一个端口，避免端口冲突
 * @param server - HTTP 服务器实例，WebSocket 将挂载到其上
 * @returns WebSocket 服务器实例
 */
export function registerWsHandlers({ app }: { app: Hono }): { injectWebSocket: any, wss: any } {
  const { wss, injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  app.get('/ws', upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        let msg: LyquorRequest
        try {
          msg = JSON.parse(event.data.toString())
        } catch {
          ws.send(JSON.stringify({ type: 'error', data: 'Invalid JSON' }))
          return
        }

        const { type, data, id } = msg || {}
        try {
          lyquor_dispatch(type, data, (evt: LyquorEvent) => {
            ws.send(JSON.stringify({ ...evt, id }))
          })
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', data: String(err?.message || err), id }))
        }
      }
    }
  }))

  return { injectWebSocket, wss }
}
