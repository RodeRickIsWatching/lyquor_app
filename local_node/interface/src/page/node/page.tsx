import { defaultPort } from "@/constants";
import { useLocalNodeMeta } from "@/hooks/use-local-node-meta";
import { DefaultPage } from "@/page/default"
import { Outlet, useParams } from "react-router"

export default function NodeMetaPanel() {
    const { meta, loading, error, refresh } = useLocalNodeMeta(defaultPort);
    console.log('meta', meta)
  
    if (loading) return <div>loading…</div>;
    if (error) return <div>error: {error}</div>;
  
    return (
      <div>
        <h3>Port: {meta.port}</h3>
        <p>Lyquids: {meta.lyquids.join(", ")}</p>
        {meta.lyquids.map(id => (
          <pre key={id}>
            {id}:
            {JSON.stringify(meta.items[id], null, 2)}
          </pre>
        ))}
        <button onClick={refresh}>手动刷新</button>
      </div>
    );
  }

export const NodePage = () => {
    const { port } = useParams()

    


    if(!port){
        return <DefaultPage />
    }
    return <>
        <NodeMetaPanel/>
        <Outlet />
    </>
}