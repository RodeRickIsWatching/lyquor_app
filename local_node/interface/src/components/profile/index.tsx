import * as React from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, Wallet } from "lucide-react"

export const Profile = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="gap-2 py-5">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" className="w-56">
          {connectors?.map((connector) => (
            <DropdownMenuItem
              key={connector.id}
              onClick={() => connect({ connector })}
            //   disabled={!connector.ready}
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const shortAddress = `${address?.slice(0, 6)}...${address?.slice(-4)}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 py-5">
          <Avatar className="h-6 w-6 ">
            <AvatarFallback className="dark:bg-white bg-black text-white dark:text-black">
              {address?.slice(-2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{shortAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" className="w-48">
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => disconnect()}
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
