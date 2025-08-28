import { useCallback, useEffect, useMemo, useRef } from "react";
import { create } from "zustand";
import { useLocalNodeWs } from "@/hooks/use-local-node-ws";
import { lyquidRpcCommands } from "@/utils/method-factory";


// ---------- Types ----------
export type ConsoleSnapshot = {
  lineId?: number;
  lineNum?: number;
  text?: string;
};

export type LyquidItemMeta = {
  id: string;
  latestInfo?: any; // LyquidInfo | null
  console?: ConsoleSnapshot; // last readConsole snapshot
};

export type NodeMeta = {
  port: string;
  fetchedAt?: number;
  lyquids: string[];
  items: Record<string, LyquidItemMeta>; // key by lyquid id
};

// ---------- Store (per app, keyed by port) ----------
type NodeMetaStoreState = {
  nodesByPort: Record<string, NodeMeta>;
  loadingByPort: Record<string, boolean>;
  errorByPort: Record<string, string | null>;
  setLoading: (port: string, v: boolean) => void;
  setError: (port: string, err: string | null) => void;
  upsertNode: (port: string, patch: Partial<NodeMeta>) => void;
  upsertItem: (port: string, lyquidId: string, patch: Partial<LyquidItemMeta>) => void;
  reset: (port: string) => void;
};

export const useLocalNodeMetaStore = create<NodeMetaStoreState>((set) => ({
  nodesByPort: {},
  loadingByPort: {},
  errorByPort: {},
  setLoading: (port, v) =>
    set((s) => ({ loadingByPort: { ...s.loadingByPort, [port]: v } })),
  setError: (port, err) =>
    set((s) => ({ errorByPort: { ...s.errorByPort, [port]: err } })),
  upsertNode: (port, patch) =>
    set((s) => {
      const prev: NodeMeta = s.nodesByPort[port] ?? {
        port,
        lyquids: [],
        items: {},
      };
      return { nodesByPort: { ...s.nodesByPort, [port]: { ...prev, ...patch } } };
    }),
  upsertItem: (port, lyquidId, patch) =>
    set((s) => {
      const prevNode: NodeMeta = s.nodesByPort[port] ?? {
        port,
        lyquids: [],
        items: {},
      };
      const prevItem: LyquidItemMeta = prevNode.items[lyquidId] ?? { id: lyquidId };
      const nextNode: NodeMeta = {
        ...prevNode,
        items: { ...prevNode.items, [lyquidId]: { ...prevItem, ...patch } },
      };
      return { nodesByPort: { ...s.nodesByPort, [port]: nextNode } };
    }),
  reset: (port) =>
    set((s) => {
      const next = { ...s.nodesByPort };
      delete next[port];
      const nextL = { ...s.loadingByPort } as Record<string, boolean>;
      delete nextL[port];
      const nextE = { ...s.errorByPort } as Record<string, string | null>;
      delete nextE[port];
      return { nodesByPort: next, loadingByPort: nextL, errorByPort: nextE };
    }),
}));

// ---------- Helper: JSON-RPC call with id correlation ----------

type Pending = { method: string; resolve: (v: any) => void; reject: (e: any) => void };

// Hook returns port-scoped meta and a refresh()
export function useLocalNodeMeta(port: string) {
  const idRef = useRef(1);
  const pendingRef = useRef<Record<number, Pending>>({});

  const { upsertNode, upsertItem, setLoading, setError } = useLocalNodeMetaStore();
  const node = useLocalNodeMetaStore((s) => s.nodesByPort[port]);
  const loading = useLocalNodeMetaStore((s) => s.loadingByPort[port] ?? false);
  const error = useLocalNodeMetaStore((s) => s.errorByPort[port] ?? null);

  const { sendMessage, readyState } = useLocalNodeWs(port, {
    onMessage: (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        // Handle normal responses
        if (msg && typeof msg === "object" && "id" in msg) {
          const p = pendingRef.current[msg.id as number];
          if (p) {
            delete pendingRef.current[msg.id as number];
            if ("result" in msg) p.resolve(msg.result);
            else if ("error" in msg) p.reject(msg.error);
            return;
          }
        }
        // TODO: handle subscriptions here if needed later
      } catch (e) {
        // ignore
      }
    },
  });

  const callRpc = useCallback(
    (method: keyof typeof lyquidRpcCommands, params?: any, ctx?: Record<string, string>) => {
      return new Promise<any>((resolve, reject) => {
        if (readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket not connected"));
          return;
        }
        const id = idRef.current++;
        pendingRef.current[id] = { method, resolve, reject };
        const payload = lyquidRpcCommands[method].buildPayload(
          params === undefined ? lyquidRpcCommands[method].defaultParams : params,
          id,
          ctx ?? {}
        );
        sendMessage(payload);
      });
    },
    [readyState, sendMessage]
  );

  const refresh = useCallback(async () => {
    setLoading(port, true);
    setError(port, null);
    try {
      // 1) list lyquids
      const lyquids: string[] = await callRpc("lyquor_listLyquids");
      upsertNode(port, { port, lyquids, fetchedAt: Date.now() });

      // 2) for each lyquid: fetch latest info + read console (in parallel per id)
      const perIdTasks = lyquids.map(async (id) => {
        try {
          const [latestInfo, consoleSnap] = await Promise.all([
            callRpc("lyquor_getLatestLyquidInfo", [id], { lyquid_id: id }),
            callRpc(
              "lyquor_readConsole",
              // use default with placeholder <lyquid_id>
              undefined,
              { lyquid_id: id }
            ),
          ]);
          upsertItem(port, id, { id, latestInfo, console: consoleSnap });
        } catch (e) {
          // keep going for other ids
          upsertItem(port, id, { id });
        }
      });

      await Promise.allSettled(perIdTasks);
      upsertNode(port, { fetchedAt: Date.now() });
    } catch (e: any) {
      setError(port, e?.message ?? String(e));
    } finally {
      setLoading(port, false);
    }
  }, [callRpc, port, setError, setLoading, upsertItem, upsertNode]);

  // Auto trigger when connected
  useEffect(() => {
    if (readyState === WebSocket.OPEN) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyState, port]);

  return useMemo(
    () => ({
      meta: node ?? { port, lyquids: [], items: {} },
      loading,
      error,
      refresh,
    }),
    [node, loading, error, port, refresh]
  );
}
