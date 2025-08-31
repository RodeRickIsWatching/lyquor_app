import { lyquorTestnetWs } from "@/constants";

// ws/localNodeWs.ts
type EventType = "open" | "message" | "error" | "close";

class NodeWsInstance {
  private ws: WebSocket;
  private listeners: Record<EventType, Set<(e: any) => void>> = {
    open: new Set(),
    message: new Set(),
    error: new Set(),
    close: new Set(),
  };

  // 状态快照：用于新监听器的立即回放
  private lastOpen: Event | null = null;
  private lastClose: CloseEvent | null = null;
  private lastError: Event | null = null;

  // 给 useSyncExternalStore 用的状态订阅器
  private stateSubscribers = new Set<() => void>();

  constructor(port: string | number) {
    this.ws = new WebSocket(lyquorTestnetWs);
    this.bind();
  }

  private bind() {
    this.ws.onopen = (e) => {
      this.lastOpen = e;
      this.emit("open", e);
      this.notifyStateChange();
    };
    this.ws.onmessage = (e) => {
      this.emit("message", e);
    };
    this.ws.onerror = (e) => {
      this.lastError = e;
      this.emit("error", e);
      this.notifyStateChange();
    };
    this.ws.onclose = (e) => {
      this.lastClose = e;
      this.emit("close", e);
      this.notifyStateChange();
    };
  }

  /** 原生事件分发给所有监听器 */
  private emit(type: EventType, e: any) {
    this.listeners[type].forEach((cb) => {
      try { cb(e); } catch (err) { console.error("[ws listener error]", err); }
    });
  }

  /** 供 hook 订阅状态变化（open/close/error 触发） */
  subscribeState(cb: () => void) {
    this.stateSubscribers.add(cb);
    return () => this.stateSubscribers.delete(cb);
  }
  private notifyStateChange() {
    this.stateSubscribers.forEach((cb) => {
      try { cb(); } catch (err) { console.error("[ws state subscriber error]", err); }
    });
  }

  /** 添加事件监听；对 open/close/error 做一次快照回放 */
  addListener<T extends EventType>(type: T, cb: (e: T extends "message" ? MessageEvent : any) => void) {
    this.listeners[type].add(cb as any);

    // 晚订阅也能马上获得当前状态
    if (type === "open" && this.ws.readyState === WebSocket.OPEN && this.lastOpen) {
      // 下一 tick 回放，避免同步调用导致意外 setState
      queueMicrotask(() => (cb as any)(this.lastOpen));
    }
    if (type === "close" && this.ws.readyState === WebSocket.CLOSED && this.lastClose) {
      queueMicrotask(() => (cb as any)(this.lastClose));
    }
    if (type === "error" && this.lastError) {
      queueMicrotask(() => (cb as any)(this.lastError));
    }

    return () => this.removeListener(type, cb as any);
  }

  removeListener(type: EventType, cb: (e: any) => void) {
    this.listeners[type].delete(cb);
  }

  /** 发送消息（字符串或对象） */
  sendMessage(data: string | object) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[ws] not connected, message dropped:", data);
      return;
    }
    this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
  }

  get readyState() {
    return this.ws.readyState;
  }
  get socket() {
    return this.ws;
  }
}

/** —— 全局按端口复用的单例池 —— */
const instances = new Map<string | number, NodeWsInstance>();
export function getLocalNodeWs(port: string | number) {
  if (!instances.has(port)) {
    instances.set(port, new NodeWsInstance(port));
  }
  return instances.get(port)!;
}
