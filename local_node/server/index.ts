import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { serve } from '@hono/node-server'
import { registerHttpRoutes } from './network/http/index.ts'
import { registerWsHandlers } from './network/ws/index.ts'
import { showRoutes } from 'hono/dev'


const PORT = 9527;
const app = new Hono()

app.use('/api/*', cors())


registerHttpRoutes({ app })
const { injectWebSocket, wss } = registerWsHandlers({ app })
// http
// http://localhost:9527/api/v1/dispatch post {type: 'ping', data: null}
// ws
// ws://localhost:9527/ws {type: 'ping', data: null, id: Date.now()}

showRoutes(app)

const server = serve({ fetch: app.fetch, port: PORT })
injectWebSocket(server)

console.log(`🚀 HTTP running at http://localhost:${PORT}`)
console.log(`🔌 WS running at ws://localhost:${PORT}`)