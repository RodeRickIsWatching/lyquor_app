import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlaygroundTree } from "@/stores/playground-tree-store";
import { v4 as uuidv4 } from "uuid"
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router"
import TerminalView from "@/components/terminal-view";
import { Loader } from "lucide-react";
import { sleep } from "@/utils";
import { terminalTestnetWs } from "@/constants";

const localWs = new WebSocket(terminalTestnetWs)

export const PlaygroundPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const add = usePlaygroundTree(state => state.addPlayground)
  const items = usePlaygroundTree(state => state.playgrounds)

  const current = useMemo(() => items.find(i => i.id === id), [items, id])
  const [openedIds, setOpenedIds] = useState<string[]>([])
  useEffect(() => {
    if (id && !openedIds.includes(id)) {
      setOpenedIds((prev) => [...prev, id])
    }
  }, [id, openedIds])

  const handleGeneratePlayground = () => {
    const newId = uuidv4()
    add({ id: String(newId), name: String(newId) })
    navigate(`/playground/${newId}`)
  }

  const handleStartDevnet = async ()=>{
    dispatchEvent(new CustomEvent('exec_cmd', {detail: { id, cmd: 'export PATH=\"$HOME/.shakenup/bin:$PATH\"', submit: true }}))
    await sleep(2_000)
    dispatchEvent(new CustomEvent('exec_cmd', {detail: { id, cmd: '~/.shakenup/bin/start-devnet', submit: true }}))
  }

  const handleInterrupt = ()=>{
    dispatchEvent(new CustomEvent('exec_cmd', {detail: { id, cmd: '__interrupt__', submit: true }}))
  }

  const handleTerminate = ()=>{
    dispatchEvent(new CustomEvent('exec_cmd', {detail: { id, cmd: '__terminate__', submit: true }}))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="truncate">Playground</CardTitle>
          <CardDescription className="truncate">
            {current ? (
              <div className="text-sm">Current: <span className="font-mono">{current.name}</span></div>
            ) : (
              <div className="text-sm text-muted-foreground">Select a playground from the sidebar or create one.</div>
            )}
          </CardDescription>
          <CardAction className="flex flex-wrap gap-2">
            <Button onClick={handleGeneratePlayground}>Add</Button>
            <Button onClick={handleStartDevnet}>Start Devnet</Button>
            <Button onClick={handleInterrupt}>Stop</Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="p-0 flex-1">
        <div className="p-3 bg-[#1e1e1e] overflow-hidden rounded-md h-full">
          {!id ? (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Loader className="animate-spin" />
            </div>
          ) : (
            openedIds.map((oid) => (
              <TerminalView key={oid} active={oid === id} ws={localWs} id={oid} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
