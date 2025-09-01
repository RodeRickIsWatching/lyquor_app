export const lyquorTestnetPort = import.meta.env.VITE_APP_WS_PORT.toString()
export const lyquorTestnetWs = `ws://localhost:${lyquorTestnetPort}/ws`
export const lyquorTestnetHttp = `http://localhost:${lyquorTestnetPort}/api`


export const terminalTestnetPort = import.meta.env.VITE_APP_TERMINAL_WS_PORT.toString()
export const terminalTestnetWs = `ws://localhost:${terminalTestnetPort}/ws`
export const terminalTestnetHttp = `http://localhost:${terminalTestnetPort}/api`
export const editorTestnetWs = `ws://localhost:${terminalTestnetPort}/editor`