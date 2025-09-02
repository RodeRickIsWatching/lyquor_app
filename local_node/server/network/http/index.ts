import { lyquor_dispatch } from '../../dispatcher/index.ts'
import type { LyquorEvent } from '../../interface/index.ts'
import { Hono } from 'hono'

const prefix = `/api/v1`
export function registerHttpRoutes({ app }: { app: Hono }): void {
  app.get(`${prefix}/health`, (c) => c.text('OK'))

  app.post(`${prefix}/dispatch`, async (c) => {
    let body
    try {
      body = await c.req.json()
    } catch {
      return c.json({ type: 'error', data: 'Invalid JSON' }, 400)
    }
    const { type, data } = body || {}
    
    return new Promise((resolve) => {
      const events: LyquorEvent[] = []
      
      lyquor_dispatch(type, data, (evt: LyquorEvent) => {
        events.push(evt)
        
        if (evt.type === 'exit' || evt.type === 'error') {
          resolve(c.json(evt))
        }
      })
      
      setTimeout(() => {
        if (events.length > 0) {
          resolve(c.json(events[events.length - 1]))
        } else {
          resolve(c.json({ type: 'error', data: 'No response from handler' }))
        }
      }, 100)
    })
  })
}
