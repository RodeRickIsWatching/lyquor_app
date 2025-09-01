import { lyquorTestnet } from '@/constants/chain'
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const CHAIN_MAP = {
  [mainnet.id]: mainnet,
  [sepolia.id]: sepolia,
  [lyquorTestnet.id]: lyquorTestnet
}

export const config = createConfig({
  chains: [mainnet, sepolia, lyquorTestnet],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [lyquorTestnet.id]: http()
  },
})