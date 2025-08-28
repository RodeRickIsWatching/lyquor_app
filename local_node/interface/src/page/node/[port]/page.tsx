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
import { useParams } from "react-router";
import { Circle } from "lucide-react"; // 状态小圆点
import { defaultPort } from "@/constants";
import { useLocalNodeWs } from "@/hooks/use-local-node-ws";
import { lyquidRpcCommands } from "@/utils/method-factory";


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

export const SpecificNodePage = () => {
    const { port, lyquid_id } = useParams();
    const [isConnected, setConnected] = React.useState(false);

    const [paramText, setParamText] = React.useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        Object.values(lyquidRpcCommands).forEach((cmd) => {
            const resolvedParams = resolveParams(cmd.defaultParams, { lyquid_id });
            init[cmd.method] = pretty(resolvedParams);
        });
        return init;
    });

    const [log, setLog] = React.useState<string>("");
    const logRef = React.useRef<HTMLDivElement | null>(null);
    const idRef = React.useRef<number>(65535);

    const appendLog = React.useCallback((line: string) => {
        setLog((prev) => prev + (prev ? "\n" : "") + line);
        requestAnimationFrame(() => {
            if (logRef.current) {
                logRef.current.scrollTop = logRef.current.scrollHeight;
            }
        });
    }, []);

    const { sendMessage, readyState } = useLocalNodeWs(defaultPort, {
        onOpen() {
            appendLog("[info] Connected to Lyquor WS API");
            setConnected(true);
        },
        onMessage(msg: any) {
            try {
                // 优先尝试 JSON pretty print
                const parsed = JSON.parse(msg.data);

                if(parsed.id <= 655235) return

                appendLog(`<< ${JSON.stringify(parsed, null, 2)}`);
            } catch {
                // 如果不是 JSON，就原样输出
                appendLog(`<< ${msg.data}`);
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

    const sendRpc = (method: string) => {
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
        const payload = cmd.buildPayload(params, idRef.current++, { lyquid_id: lyquid_id ?? "" });
        appendLog(`>> ${payload}`);
        sendMessage(payload);
    };


    return (
        <div className="text-sm overflow-hidden h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 p-4">
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
                    <Accordion type="multiple" className="space-y-2">
                        {Object.values(lyquidRpcCommands).map((cmd) => (
                            <AccordionItem key={cmd.method} value={cmd.method}>
                                <AccordionTrigger className="flex items-center justify-between px-3 py-2 text-sm">
                                    <span className="font-medium text-sm">{cmd.method}</span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Textarea
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
                </CardContent>
            </Card>

            {/* 右侧日志 */}
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Logs</CardTitle>
                    <CardDescription>请求 / 响应 与推送消息</CardDescription>
                    <CardAction >
                        <Button onClick={() => setLog("")}>Clear Logs</Button>
                    </CardAction>
                </CardHeader>
                <Separator />
                <CardContent className="h-full overflow-auto">
                    <div className="overflow-auto w-full h-full border rounded-md p-3 bg-black text-green-400 shadow-inner shadow-green-900/50">
                        <pre
                            ref={logRef}
                            className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap"
                        >
                            {log}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
