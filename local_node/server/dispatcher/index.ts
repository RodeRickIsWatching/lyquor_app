import { dispatcherMap } from './registry.ts'
import type { LyquorEvent } from '../interface/index.ts'

/**
 * 统一调度器
 * @param {string} type - 事件类型
 * @param {any} data - 传入参数
 * @param {(evt: LyquorEvent) => void} sink - 统一输出
 * @returns Promise<void> | void - 如果是异步操作返回Promise
 */
export function lyquor_dispatch(type: string, data: any, sink: (evt: LyquorEvent) => void): Promise<void> | void {
  const entry = dispatcherMap[type]
  if (!entry) {
    sink({ type: 'error', data: `Unknown type: ${type}` })
    return
  }

  try {
    // handler 可能是同步或异步
    const result = entry.handler(data, sink)
    if (result instanceof Promise) {
      return result.catch((err) => {
        sink({ type: 'error', data: err?.message || String(err) })
      })
    }
    return result
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    sink({ type: 'error', data: errorMessage })
  }
}
