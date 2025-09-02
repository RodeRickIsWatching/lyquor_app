import { lyquorTestnet } from "@/constants/chain"
import { createWalletClient, custom } from "viem"

export const handleAddChain = async () => {
  const walletClient = createWalletClient({
      transport: custom(window.ethereum!),
  })
  await walletClient.addChain({ chain: lyquorTestnet })
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }