import { create } from "zustand";
import { useEffect } from "react";
import { useLocalNodeWs } from "@/hooks/use-local-node-ws";

type BlockState = {
    blockNumber: number;
    gasPrice: number;
    lastUpdated: number;
    setBlock: (blockNumber: number, gasPrice: number) => void;
};

export const useBlockStore = create<BlockState>((set) => ({
    blockNumber: 0,
    gasPrice: 0,
    lastUpdated: 0,
    setBlock: (blockNumber, gasPrice) =>
        set({
            blockNumber,
            gasPrice,
            lastUpdated: Date.now(),
        }),
}));


const pollingInterval = 2_000

// ✅ Hook: 自动更新 block & gasPrice
export const useBlockUpdater = (defaultPort: string) => {
    const { callRpc } = useLocalNodeWs(defaultPort);
    const { setBlock, lastUpdated } = useBlockStore();

    // 心跳：每 5s 检查是否需要主动获取
    useEffect(() => {
        const interval = setInterval(async () => {
            const now = Date.now();
            if (now - lastUpdated > pollingInterval) {
                try {
                    const [blockHex, gasPriceHex] = await Promise.all([
                        callRpc("eth_blockNumber"),
                        callRpc("eth_gasPrice"),
                    ]);
                    const blockNumber = parseInt(blockHex, 16);
                    const gasPrice = parseInt(gasPriceHex, 16);
                    setBlock(blockNumber, gasPrice);
                } catch (err) {
                    console.error("Failed to fetch block/gasPrice:", err);
                }
            }
        }, pollingInterval);

        return () => clearInterval(interval);
    }, [callRpc, lastUpdated, setBlock]);
};
