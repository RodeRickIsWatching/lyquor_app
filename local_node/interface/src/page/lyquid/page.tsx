import { LyquidSummaryCard } from "@/components/lyquid-summary-card";
import { defaultPort } from "@/constants";
import { useLocalNodeMetaStore } from "@/hooks/use-local-node-meta";
import { Outlet, useParams } from "react-router";

export function LyquidPage() {
    const { lyquid_id } = useParams()
    const { nodesByPort } = useLocalNodeMetaStore()
    const meta = nodesByPort?.[defaultPort]

    if(lyquid_id){
        return <Outlet />
    }
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {meta?.lyquids?.map((id) => {
                const item = meta?.patch?.[id];
                return (
                    <LyquidSummaryCard
                        key={id}
                        data={{
                            id: id || '',
                            name: id || '',
                            contract: item?.lyquor_getLatestLyquidInfo?.contract || '',
                        }}
                    />
                );
            })}
        </div>
    );
}
