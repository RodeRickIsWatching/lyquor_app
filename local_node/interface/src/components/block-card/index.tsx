import { Button } from "@/components/ui/button"
import { useBlockStore } from "@/hooks/use-block-updater"
import { Box, Fuel } from "lucide-react"
import { formatEther, formatUnits } from "viem"
import bn from "bignumber.js"



export const BlockCard = () => {
    const { blockNumber, gasPrice, lastUpdated } = useBlockStore()
    return <div className="flex items-center gap-2 justify-between w-full [&_button]:flex-1">
        <Button size="sm" >
            <Fuel className="size-3" />
            <span className="text-xs">{bn(formatUnits(BigInt(gasPrice), 9)).toFixed(4, bn.ROUND_DOWN)} gwei</span>
        </Button>
        <Button size="sm" >
            <Box className="size-3" />
            <span>{blockNumber}</span>
        </Button>
    </div>
}