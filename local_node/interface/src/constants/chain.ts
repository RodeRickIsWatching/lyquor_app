import { lyquorTestnetHttp, lyquorTestnetWs } from "@/constants";
import { defineChain } from "viem";

export const lyquorTestnet = defineChain({
    id: 31_337,
    name: "Lyquor Testnet",
    nativeCurrency: { name: 'Lyquor Test Token', symbol: 'tLYQ', decimals: 18 },
    rpcUrls: {
        default: {
            http: [lyquorTestnetHttp],
            webSocket: [lyquorTestnetWs]
        }
    }
});
