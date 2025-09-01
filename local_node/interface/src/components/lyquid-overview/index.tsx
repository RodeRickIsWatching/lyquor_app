import { lyquorTestnetPort } from "@/constants"
import { useLocalNodeMetaStore, type LyquidItemMeta } from "@/hooks/use-local-node-meta"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, handleAddChain } from "@/lib/utils";
import { useBlockStore } from "@/hooks/use-block-updater";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Metamask } from "@/components/svg/metamask";

export const ChainId = ({ chainId }: { chainId: number }) => {

    const handleClick = async () => {
        handleAddChain()
    }

    return <div className="flex items-center gap-1">
        <span>{chainId}</span>
        <Button onClick={handleClick} variant="link" className="cursor-pointer text-xs p-0 h-fit text-gray-500 size-3 ">
            <div className="size-full"><Metamask className="size-full -mt-1/2" /></div>
        </Button>
    </div>
}

export function LyquidOverview({ lyquid_id }: { lyquid_id?: string }) {
    const { nodesByPort } = useLocalNodeMetaStore()
    const { blockNumber, gasPrice, lastUpdated } = useBlockStore()
    const nodeMeta = lyquid_id ? (nodesByPort?.[lyquorTestnetPort]?.patch?.[lyquid_id] || {}) : {}

    const {
        lyquor_getLatestLyquidInfo = {},
        lyquor_readConsole = '',
        eth_chainId = ''
    } = nodeMeta as LyquidItemMeta

    return (
        <div className="space-y-4 relative">
            <div className="absolute top-0 right-0 -translate-y-[150%] text-gray-500 text-xs">Last Updated: {dayjs(lastUpdated).format('MMM D, HH:mm:ss')}</div>
            <div className="flex gap-4">
                {[
                    { label: "Chain ID", value: <ChainId chainId={Number(eth_chainId)} /> },
                    { label: "Block", value: blockNumber },
                    { label: "Gas Price", value: <>{gasPrice} <span className="text-gray-500 text-xs">Wei</span></> },
                    { label: "TPS", value: <>-</> },
                ].map((item, idx) => (
                    <Card key={idx} className={cn("rounded-xl shadow-sm border p-2 flex-1", item?.className)}>
                        <CardContent className="p-2 flex flex-col gap-1">
                            <span className="text-[11px] text-muted-foreground tracking-wide">
                                {item.label}
                            </span>
                            <span className="font-mono text-sm">{item.value}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* --- Contract Info --- */}
            <div className="flex gap-4 items-start [&>div]:flex-1">
                <Card className="rounded-xl shadow-sm">
                    <CardHeader className="">
                        <CardTitle className="text-sm">Lyquid Contract</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Address</span>
                            <span className="font-mono text-xs break-all">
                                {lyquor_getLatestLyquidInfo?.contract}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                            <span>Image</span>
                            <span className="font-mono">{lyquor_getLatestLyquidInfo?.number?.image}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Var</span>
                            <span className="font-mono">{lyquor_getLatestLyquidInfo?.number?.var}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                    <CardHeader className="">
                        <CardTitle className="text-sm">Console</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-auto w-full h-full">
                            <pre>
                                {JSON.stringify(lyquor_readConsole, null, 2)}
                            </pre>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
