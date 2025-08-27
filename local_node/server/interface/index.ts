// 定义请求的基础结构
export interface LyquorRequest<T = any> {
  id?: string | number
  type: string
  data?: T
}

// 定义事件/响应的基础结构
export interface LyquorEvent<T = any> {
  id?: string | number
  type: 'success' | 'error' | 'log' | 'exit' | 'stdout' | 'stderr' | 'pong' | string
  data?: T
  payload?: T
}

// 调度器的 handler 类型
export type LyquorHandler<T = any, R = any> = (
  data: T,
  emit: (evt: LyquorEvent<R>) => void
) => Promise<void> | void

// 注册表项的类型
export interface RegistryEntry {
  handler: LyquorHandler
  description?: string
  path?: string
}

// Dispatcher 的映射表
export interface DispatcherMap {
  [key: string]: RegistryEntry
}
  