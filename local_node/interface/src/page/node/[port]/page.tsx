import { RpcCommand } from "@/components/rpc-command";
import { useParams } from "react-router";


export const SpecificNodePage = () => {
    const { lyquid_id } = useParams();
    
    return <RpcCommand lyquid_id={lyquid_id} />
};
