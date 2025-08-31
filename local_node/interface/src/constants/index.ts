export const defaultPort = import.meta.env.VITE_APP_WS_PORT.toString()
export const lyquorTestnetWs = `ws://localhost:${defaultPort}/ws`
export const lyquorTestnetHttp = `http://localhost:${defaultPort}/api`