import { lyquor_dispatch } from '../../dispatcher/index.ts'
import type { LyquorEvent } from '../../interface/index.ts'
import { Hono } from 'hono'

const prefix = `/api/v1`
/**
 * 只做"注册路由"，不创建 Hono 实例
 */
export function registerHttpRoutes({ app }: { app: Hono }): void {
  // 健康检查
  app.get(`${prefix}/health`, (c) => c.text('OK'))

  // 统一调度入口：简单JSON响应
  app.post(`${prefix}/dispatch`, async (c) => {
    let body
    try {
      body = await c.req.json()
    } catch {
      return c.json({ type: 'error', data: 'Invalid JSON' }, 400)
    }
    console.log('body', body)

    
    const { type, data } = body || {}
    
    // 使用 Promise 包装调度器调用
    return new Promise((resolve) => {
      const events: LyquorEvent[] = []
      
      console.log('type', type, data)
      lyquor_dispatch(type, data, (evt: LyquorEvent) => {
        events.push(evt)
        
        // 如果收到 exit 或 error 事件，立即返回响应
        if (evt.type === 'exit' || evt.type === 'error') {
          resolve(c.json(evt))
        }
      })
      
      // 如果没有 exit 或 error 事件，等待一小段时间后返回最后一个事件
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
