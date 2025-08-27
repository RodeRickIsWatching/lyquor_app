import { handleDevnet, handleStdin, handleTerminal, stopDevnet } from './terminal.ts'
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
  stdin: {
    handler: (data, emit) => {
      handleStdin(data)
    },
    description: '终端输入',
    path: '/stdin'
  },
  'start-devnet': {
    handler: async (_data, emit) => {
      handleDevnet(emit)
    },
    description: '启动本地 Devnet 节点',
    path: '/start-devnet'
  },

  'stop-devnet': {
    handler: async (_data, emit) => {
      stopDevnet(emit)
    },
    description: '停止本地 Devnet 节点',
    path: '/stop-devnet'
  },
}
