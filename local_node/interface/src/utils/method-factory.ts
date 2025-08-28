// rpc/method-factory.ts
export type MethodItem = {
    method: string;
    label: string;
    desc?: string;
    defaultParams?: any;
    badge?: string;
};

const METHODS: MethodItem[] = [
    {
        method: "lyquor_listLyquids",
        label: "List Lyquids",
        desc: "列出 Lyquids",
        defaultParams: [false],
    },
    {
        method: "lyquor_readConsole",
        label: "Read Console",
        desc: "一次性拉取控制台",
        defaultParams: [
            {
                id: "<lyquid_id>",
                sink: "stdOut",
                rowLimits: null,
                idLimits: null,
            },
        ],
    },
    {
        method: "lyquor_getLatestLyquidInfo",
        label: "Get Latest Lyquid Info",
        desc: "最新 lyquid 信息",
        defaultParams: ["<lyquid_id>"],
    },
    {
        method: "lyquor_getIdByEthAddr",
        label: "Get ID by Address",
        desc: "通过地址获取 ID",
        defaultParams: ["0x0000000000000000000000000000000000000000"],
    },
    {
        method: "lyquor_subscribe",
        label: "Subscribe Console",
        desc: "订阅控制台推送",
        defaultParams: [
            {
                kind: {
                    console: {
                        id: "<lyquid_id>",
                        sink: "stdOut",
                    },
                },
            },
        ],
        badge: "primary",
    },
    {
        method: "lyquor_load",
        label: "Load",
        desc: "加载 lyquid",
        defaultParams: ["<lyquid_id>"],
    },
    {
        method: "lyquor_unload",
        label: "Unload",
        desc: "卸载 lyquid",
        defaultParams: ["<lyquid_id>"],
        badge: "destructive",
    },
    {
        method: "lyquor_pushImage",
        label: "Push Image",
        defaultParams: ["<Bytes>"],
        badge: "destructive",
    },
    {
        method: "eth_call",
        label: "eth_call",
        desc: "以太坊风格调用",
        defaultParams: [{ to: "0x...", data: "0x..." }, "latest"],
    },
];


export type RpcCommand = {
  method: string;
  defaultParams?: any;
  buildPayload: (
    params?: any,
    id?: number,
    ctx?: Record<string, string>
  ) => string;
};

// 占位符替换
function replacePlaceholders(obj: any, ctx: Record<string, string>): any {
  if (typeof obj === "string") {
    return obj.replace(/<([^>]+)>/g, (_, key) => ctx[key] ?? obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replacePlaceholders(item, ctx));
  }
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, replacePlaceholders(v, ctx)])
    );
  }
  return obj;
}

export function createRpcCommandMap(methods: MethodItem[]): Record<string, RpcCommand> {
  const map: Record<string, RpcCommand> = {};
  for (const m of methods) {
    map[m.method] = {
      method: m.method,
      defaultParams: m.defaultParams ?? [],
      buildPayload: (params = m.defaultParams, id = 1, ctx: Record<string,string> = {}) => {
        const resolvedParams = replacePlaceholders(params, ctx);
        return JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: m.method,
          params: resolvedParams,
        });
      },
    };
  }
  return map;
}


export const lyquidRpcCommands = createRpcCommandMap(METHODS);
