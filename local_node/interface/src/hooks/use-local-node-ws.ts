// hooks/useLocalNodeWs.ts
import { useEffect, useMemo, useRef } from "react";
import { useSyncExternalStore } from "react";
import { getLocalNodeWs } from "@/utils/ws";
import { lyquidRpcCommands } from "@/utils/method-factory";

type Handlers = {
  onOpen?: (e: Event) => void;
  onMessage?: (e: MessageEvent) => void;
  onError?: (e: Event) => void;
  onClose?: (e: CloseEvent) => void;
};

export function useLocalNodeWs(port: string | number, handlers?: Handlers) {
  const idRef = useRef(1);
  const pendingRef = useRef<Map<number, { resolve: any; reject: any }>>(new Map());

  const inst = useMemo(() => getLocalNodeWs(port), [port]);

  const readyState = useSyncExternalStore(
    (cb) => inst.subscribeState(cb),
    () => inst.readyState,
    () => WebSocket.CLOSED
  );

  useEffect(() => {
    const offs: Array<() => void> = [];
    if (handlers?.onOpen) offs.push(inst.addListener("open", handlers.onOpen));
    if (handlers?.onError) offs.push(inst.addListener("error", handlers.onError));
    if (handlers?.onClose) offs.push(inst.addListener("close", handlers.onClose));

    // 核心：onMessage 处理 JSON-RPC 响应
    offs.push(
      inst.addListener("message", (evt: MessageEvent) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg && typeof msg === "object" && "id" in msg) {
            const pending = pendingRef.current.get(msg.id);
            if (pending) {
              pendingRef.current.delete(msg.id);
              if ("result" in msg) pending.resolve(msg.result);
              else if ("error" in msg) pending.reject(msg.error);
              return;
            }
          }
          // 透传给外部 handler（比如订阅事件）
          handlers?.onMessage?.(evt);
        } catch (e) {
          // ignore
        }
      })
    );

    return () => offs.forEach((off) => off());
  }, [inst]);

  const sendMessage = inst.sendMessage.bind(inst);

  const callRpc = (method: keyof typeof lyquidRpcCommands, params?: any, ctx?: Record<string, string>) => {
    return new Promise<any>((resolve, reject) => {
      if (readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }
      const id = idRef.current++;
      const payload = lyquidRpcCommands[method].buildPayload(
        params === undefined ? lyquidRpcCommands[method].defaultParams : params,
        id,
        ctx ?? {}
      );
      pendingRef.current.set(id, { resolve, reject });
      sendMessage(payload);

      // 可选：超时处理
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id);
          reject(new Error(`RPC call ${method} (id=${id}) timed out`));
        }
      }, 10_000);
    });
  };

  return {
    ws: inst.socket,
    sendMessage,
    callRpc,
    readyState,
  };
}
