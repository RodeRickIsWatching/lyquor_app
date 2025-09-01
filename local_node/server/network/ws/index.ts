import { lyquor_dispatch } from '../../dispatcher/index.ts'
import type { LyquorEvent, LyquorRequest } from '../../interface/index.ts'
import type { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import { editor_dispatch } from '../../dispatcher/editor/index.ts'

function createHandler(dispatch: Function) {
  return (c: any) => {
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
          dispatch(type, data, (evt: LyquorEvent) => {
            ws.send(JSON.stringify({ ...evt, id }))
          })
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', data: String(err?.message || err), id }))
        }
      }
    }
  }
}

export function registerWsHandlers({ app }: { app: Hono }) {
  const { wss, injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  // 全局 dispatcher
  app.get('/ws', upgradeWebSocket(createHandler(lyquor_dispatch)))

  // editor 专用 dispatcher
  app.get('/editor', upgradeWebSocket(createHandler(editor_dispatch)))

  return { injectWebSocket, wss }
}
