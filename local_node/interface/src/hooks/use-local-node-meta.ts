/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { create } from "zustand";
import { useLocalNodeWs } from "@/hooks/use-local-node-ws";
import { toast } from "sonner";
import { lyquorTestnetHttp } from "@/constants";
import { lyquidRpcCommands } from "@/utils/method-factory";


export interface LyquorLatestInfo {
  contract: string;
  number: {
    image: number;
    var: number;
  };
}

export interface LyquorConsole {
  line_id: number;
  line_num: number;
  text: string;
}

export interface NodeOverview {
  lyquor_getLatestLyquidInfo: LyquorLatestInfo;
  lyquor_readConsole: LyquorConsole;
  net_version: string;
  eth_blockNumber: string;
  eth_gasPrice: string;
  eth_chainId: string;
}


export type ConsoleSnapshot = {
  lineId?: number;
  lineNum?: number;
  text?: string;
};

export interface LyquidItemMeta extends NodeOverview {
  [key: string]: any;
};

export type NodeMeta = {
  port: string;
  fetchedAt?: number;
  lyquids: string[];
  patch?: Record<string, LyquidItemMeta>; // key by lyquid id
};

// ---------- Store (per app, keyed by port) ----------
type NodeMetaStoreState = {
  nodesByPort: Record<string, NodeMeta>;
  loadingByPort: Record<string, boolean>;
  errorByPort: Record<string, string | null>;
  setLoading: (port: string, v: boolean) => void;
  setError: (port: string, err: string | null) => void;
  upsertNode: (port: string, patch: Partial<NodeMeta>) => void;
  upsertItem: (port: string, lyquidId: string, patch?: Partial<LyquidItemMeta>) => void;
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
      };
      return { nodesByPort: { ...s.nodesByPort, [port]: { ...prev, ...patch } } };
    }),
  upsertItem: (port, lyquidId, patch) =>
    set((s) => {
      const prevNode: NodeMeta = s.nodesByPort[port] ?? {
        port,
        lyquids: [],
        patch: {},
      };

      const prevItem = prevNode.patch?.[lyquidId] ?? {} as LyquidItemMeta;
      const nextNode: NodeMeta = {
        ...prevNode,
        patch: { ...prevNode.patch, [lyquidId]: { ...prevItem, ...patch } },
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

// Hook returns port-scoped meta and a refresh()
export function useLocalNodeMeta(port: string) {

  const { upsertNode, upsertItem, setLoading, setError } = useLocalNodeMetaStore();
  const node = useLocalNodeMetaStore((s) => s.nodesByPort[port]);
  const loading = useLocalNodeMetaStore((s) => s.loadingByPort[port] ?? false);
  const error = useLocalNodeMetaStore((s) => s.errorByPort[port] ?? null);
  const idRef = useRef<number>(1)

  const callRpc = async (method: string, params?: any, ctx?: any) => {

    const id = idRef.current++
    const payload = lyquidRpcCommands[method].buildPayload(params, 'glob_' + id, ctx)

    const resp = await fetch(lyquorTestnetHttp, {
      method: "POST",
      body: payload
    })
    const result = await resp.json()
    return result?.result
  }

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
          const params = {
            lyquor_getLatestLyquidInfo: callRpc("lyquor_getLatestLyquidInfo", [id], { lyquid_id: id }),
            lyquor_readConsole: callRpc("lyquor_readConsole", undefined, { lyquid_id: id }),
            net_version: callRpc("net_version"),
            eth_blockNumber: callRpc("eth_blockNumber"),
            eth_gasPrice: callRpc("eth_gasPrice"),
            eth_chainId: callRpc("eth_chainId"),
          }
          const nodeMetas = await Promise.all(Object.values(params));

          console.log('nodeMetas', nodeMetas)
          const result = Object.keys(params).reduce((prev: any, next: string, index: number) => {
            const value = nodeMetas[index] as LyquidItemMeta

            return {
              ...prev,
              [next]: value
            }
          }, {})

          upsertItem(port, id, result);
        } catch (e: any) {
          toast.error(e)
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
    refresh();
  }, [port]);

  return useMemo(
    () => ({
      meta: node ?? { port, lyquids: [], patch: {} },
      loading,
      error,
      refresh,
    }),
    [node, loading, error, port, refresh]
  );
}
