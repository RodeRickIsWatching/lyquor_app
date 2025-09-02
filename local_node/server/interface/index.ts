export interface LyquorRequest<T = any> {
  id?: string | number
  type: string
  data?: T
}

export interface LyquorEvent<T = any> {
  id?: string | number
  type: 'success' | 'error' | 'log' | 'exit' | 'stdout' | 'stderr' | 'pong' | string
  data?: T
  payload?: T
}

export type LyquorHandler<T = any, R = any> = (
  data: T,
  emit: (evt: LyquorEvent<R>) => void
) => Promise<void> | void

export interface RegistryEntry {
  handler: LyquorHandler
  description?: string
  path?: string
}

export interface DispatcherMap {
  [key: string]: RegistryEntry
}
  