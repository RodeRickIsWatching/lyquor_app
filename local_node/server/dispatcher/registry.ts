import { handleTerminal } from './terminal.ts'
import type { RegistryEntry } from '../interface/index.ts'

// 每个接口注册：key -> { handler, description, path }
export const dispatcherMap: Record<string, RegistryEntry> = {
  ping: {
    handler: async (data, emit) => {
      emit({ type: 'pong', data: 'ok' })
    },
    description: 'Ping-pong 测试接口',
    path: '/ping'
  },
  terminal: {
    handler: handleTerminal,
    description: '终端命令执行接口',
    path: '/terminal'
  },
}
