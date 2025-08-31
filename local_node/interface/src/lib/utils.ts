import { lyquorTestnet } from "@/constants/chain"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createWalletClient, custom } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handleAddChain = async () => {
  const walletClient = createWalletClient({
      transport: custom(window.ethereum!),
  })
  await walletClient.addChain({ chain: lyquorTestnet })
}

