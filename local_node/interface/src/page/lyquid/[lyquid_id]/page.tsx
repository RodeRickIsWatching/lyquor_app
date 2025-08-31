import { LyquidOverview } from "@/components/lyquid-overview";
import { RpcCommand } from "@/components/rpc-command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "react-router";


export const SpecificLyquidPage = () => {
    const { lyquid_id } = useParams();
    
    return <>
    
    <Tabs className="pt-4 px-4 gap-4" defaultValue="overview">
        <TabsList className="">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><LyquidOverview lyquid_id={lyquid_id} /></TabsContent>
        <TabsContent value="playground"><RpcCommand lyquid_id={lyquid_id} /></TabsContent>

    </Tabs>
    </>
};
