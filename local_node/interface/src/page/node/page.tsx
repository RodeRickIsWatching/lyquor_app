import { DefaultPage } from "@/page/default";
import { Outlet, useParams } from "react-router";


export const NodePage = () => {
    const { port } = useParams();

    if (!port) {
        return <DefaultPage />;
    }
    return (
        <>
            <Outlet />
        </>
    );
};
