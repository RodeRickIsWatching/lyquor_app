import { dispatcherMap } from './registry.ts'
import type { LyquorEvent } from '../interface/index.ts'

export function lyquor_dispatch(type: string, data: any, sink: (evt: LyquorEvent) => void): Promise<void> | void {
  const entry = dispatcherMap[type]
  if (!entry) {
    sink({ type: 'error', data: `Unknown type: ${type}` })
    return
  }

  try {
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
