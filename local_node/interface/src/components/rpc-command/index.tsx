import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardAction,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import React, { } from "react";
import { Circle } from "lucide-react"; // 状态小圆点
import { lyquorTestnetPort, lyquorTestnetHttp } from "@/constants";
import { useLocalNodeWs } from "@/hooks/use-local-node-ws";
import { lyquidRpcCommands } from "@/utils/method-factory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePreLog } from "@/components/pre-log";


function resolveParams(defaultParams: any, ctx: { lyquid_id?: string }) {
    if (!defaultParams) return [];
    const raw = JSON.stringify(defaultParams);
    return JSON.parse(
        raw.replace(/<lyquid_id[^>]*>/g, (match) =>
            ctx.lyquid_id ? ctx.lyquid_id : match  // 没有就保留原占位符
        )
    );
}


function pretty(obj: any) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

export const RpcCommand = ({ lyquid_id }: { lyquid_id?: string }) => {
    const [isConnected, setConnected] = React.useState(false);

    const [paramText, setParamText] = React.useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        Object.values(lyquidRpcCommands).forEach((cmd) => {
            const resolvedParams = resolveParams(cmd.defaultParams, { lyquid_id });
            init[cmd.method] = pretty(resolvedParams);
        });
        return init;
    });

    const {appendLog, clearLog, PreLog} = usePreLog()
    const idRef = React.useRef<number>(1);

    const { sendMessage, readyState } = useLocalNodeWs(lyquorTestnetPort, {
        onOpen() {
            appendLog("[info] Connected to Lyquor WS API");
            setConnected(true);
        },
        onMessage(msg: any) {
            try {
                // 优先尝试 JSON pretty print
                const parsed = JSON.parse(msg.data);
                if (!parsed.id.includes('ly_')) return

                appendLog(`<< ${JSON.stringify(parsed, null, 2)}`);
            } catch(e) {
                console.error(e)
            }
        },
        onError() {
            appendLog(`[error] WebSocket: ${String(e)}`);
        },
        onClose() {
            setConnected(false);
            appendLog("[info] Disconnected from Lyquor WS API");
        },
    })

    const sendRpc = async (method: string) => {
        if (readyState !== WebSocket.OPEN) {
            appendLog("[warn] not connected");
            return;
        }
        const cmd = lyquidRpcCommands[method];
        if (!cmd) {
            appendLog(`[error] 未知方法: ${method}`);
            return;
        }
        let params: any;
        try {
            params = JSON.parse(paramText[method] || "[]");
        } catch (e) {
            appendLog(`[error] params JSON 解析失败: ${(e as Error).message}`);
            return;
        }


        const id = idRef.current++
        const payload = cmd.buildPayload(params, 'ly_' + id, { lyquid_id: lyquid_id ?? "" });
        appendLog(`>> ${payload}`);
        if (cmd?.wsOnly) {
            sendMessage(payload);
        } else {
            const resp = await fetch(lyquorTestnetHttp, {
                method: "POST",
                body: payload
            })

            const result = await resp.json()
            appendLog(`<< ${JSON.stringify(result, null, 2)}`);
        }
    };


    return (
        <div className="text-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
            {/* 左侧 */}
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>RPC Methods</CardTitle>
                        <CardDescription>点击展开，配置并发送</CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                        <Circle
                            className={`w-3 h-3 ${isConnected ? "text-green-500" : "text-red-500"
                                }`}
                            fill={isConnected ? "currentColor" : "transparent"}
                        />
                        {isConnected ? "Connected" : "Disconnected"}
                    </div>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                    <Tabs defaultValue="lyquid">
                        <TabsList className="w-full">
                            <TabsTrigger value="lyquid">Lyquid</TabsTrigger>
                            <TabsTrigger value="eth">Eth</TabsTrigger>
                        </TabsList>
                        <TabsContent value="lyquid">
                            <Accordion type="multiple" className="space-y-2">
                                {Object.values(lyquidRpcCommands)?.filter(i => i?.method?.includes('lyquor')).map((cmd) => (
                                    <AccordionItem key={cmd.method} value={cmd.method}>
                                        <AccordionTrigger className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span className="font-medium text-sm">{cmd.method}</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Textarea
                                                className="!text-sm"
                                                value={paramText[cmd.method]}
                                                onChange={(e) =>
                                                    setParamText((prev) => ({ ...prev, [cmd.method]: e.target.value }))
                                                }
                                            />
                                            <Button className="w-full mt-2 py-1 h-fit" onClick={() => sendRpc(cmd.method)}>Send</Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </TabsContent>
                        <TabsContent value="eth">
                            <Accordion type="multiple" className="space-y-2">
                                {Object.values(lyquidRpcCommands)?.filter(i => !i?.method?.includes('lyquor')).map((cmd) => (
                                    <AccordionItem key={cmd.method} value={cmd.method}>
                                        <AccordionTrigger className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span className="font-medium text-sm">{cmd.method}</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Textarea
                                                className="!text-sm"
                                                value={paramText[cmd.method]}
                                                onChange={(e) =>
                                                    setParamText((prev) => ({ ...prev, [cmd.method]: e.target.value }))
                                                }
                                            />
                                            <Button className="w-full mt-2 py-1 h-fit" onClick={() => sendRpc(cmd.method)}>Send</Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </TabsContent>
                    </Tabs>

                </CardContent>
            </Card>

            {/* 右侧日志 */}
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Logs</CardTitle>
                    <CardDescription>请求 / 响应 与推送消息</CardDescription>
                    <CardAction >
                        <Button onClick={clearLog}>Clear Logs</Button>
                    </CardAction>
                </CardHeader>
                <Separator />
                <CardContent className="h-full overflow-auto">
                    <div className="overflow-auto w-full h-full">
                        {PreLog}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
