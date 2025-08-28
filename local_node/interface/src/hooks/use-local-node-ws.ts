// hooks/useLocalNodeWs.ts
import { useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { getLocalNodeWs } from "@/utils/ws";

type Handlers = {
  onOpen?: (e: Event) => void;
  onMessage?: (e: MessageEvent) => void;
  onError?: (e: Event) => void;
  onClose?: (e: CloseEvent) => void;
};

export function useLocalNodeWs(port: string | number, handlers?: Handlers) {
  // 获取对应端口的单例
  const inst = useMemo(() => getLocalNodeWs(port), [port]);

  // readyState 响应式：open/close/error 时会触发订阅者
  const readyState = useSyncExternalStore(
    (cb) => inst.subscribeState(cb),
    () => inst.readyState,
    () => WebSocket.CLOSED // SSR 兜底
  );

  // 分别注册事件监听（互不影响）
  useEffect(() => {
    const offs: Array<() => void> = [];
    if (handlers?.onOpen)   offs.push(inst.addListener("open", handlers.onOpen));
    if (handlers?.onMessage) offs.push(inst.addListener("message", handlers.onMessage));
    if (handlers?.onError)  offs.push(inst.addListener("error", handlers.onError));
    if (handlers?.onClose)  offs.push(inst.addListener("close", handlers.onClose));
    return () => offs.forEach((off) => off());
  }, [inst]);

  return {
    ws: inst.socket,
    sendMessage: inst.sendMessage.bind(inst),
    readyState,
  };
}
