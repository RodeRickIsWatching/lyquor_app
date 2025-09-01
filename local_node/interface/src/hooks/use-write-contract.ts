import { CHAIN_MAP } from "@/constants/wagmi";
import { createPublicClient, http, type PublicClient } from "viem";
import { useWriteContract as useWagmiWriteContract, useSwitchChain, useAccount } from "wagmi";

export const txAwait = async (hash: string | `0x${string}`, publicClient?: PublicClient) => {
  if (!hash) {
    throw new Error("Invalid hash");
  }

  // 使用轮询次数而不是超时时间
  const maxRetries = 200; // 最大轮询次数
  const pollingInterval = 6_000; // 轮询间隔
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 只发送一个 RPC 请求获取交易收据
      const transaction = await publicClient?.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      // 如果找到收据
      if (transaction) {
        console.log("---writeContractAsync tx submitted---", transaction);

        return transaction;
      }

      // 增加重试计数
      retryCount++;
      console.log(`Transaction not found, retry ${retryCount}/${maxRetries}`);

      // 如果没有找到收据，等待一段时间后再次查询
      await new Promise((resolve) => setTimeout(resolve, pollingInterval));
    } catch (e: any) {
      if (e?.toString()?.includes?.("Transaction Failed")) {
        throw e;
      }

      // 如果是交易未找到错误，等待后重试
      retryCount++;
      console.log(`Transaction not found error, retry ${retryCount}/${maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      continue;
    }
  }

  // 超出最大重试次数
  console.log(`Exceeded maximum retries (${maxRetries}) for transaction`);

  throw new Error(`Transaction receipt not found after ${maxRetries} retries`);
};


export const useWriteContract = (): any => {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const wagmiProps = useWagmiWriteContract();
  // const publicClient = usePublicClient();

  const writeContractAsync = async (props: any) => {
    const { id, ...params } = props;

    if (params?.chainId) {
      if (Number(chainId) !== +params.chainId) {
        console.warn("--writeContractAsync invalid Chain--, expected:", params?.chainId, "got:", chainId);
        await switchChainAsync({
          chainId: Number(params.chainId),
        });
      }
    }

    const txHash = await wagmiProps.writeContractAsync(params);

    const publicClient = createPublicClient({
      chain: CHAIN_MAP[params?.chainId as keyof typeof CHAIN_MAP],
      transport: http(),
    });
    const tx = await txAwait(txHash, publicClient as PublicClient);
    return { txHash, tx };
  };

  return {
    ...wagmiProps,
    writeContractAsync,
  };
};
