import NavLayout from "@/layouts/nav-layout";
import { ExplorerPage } from "@/page/explorer";
import { SpecificNodePage } from "@/page/node/[port]/page";
import { NodePage } from "@/page/node/page";
import { PlaygroundPage } from "@/page/playground";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <NavLayout />,
    children: [
      {
        index: true,
        element: <ExplorerPage />,
      },
      {
        path: 'playground',
        element: <PlaygroundPage />,
        children: [
          {
            path: ':id',
            element: <PlaygroundPage />,
          },
        ]
      },
      {
        path: 'port',
        element: <NodePage />,
        children: [
          {
            path: ':port/:lyquid_id?',
            element: <SpecificNodePage />,
          }
        ]
      },
      {
        path: 'explorer',
        element: <ExplorerPage />,
      },
    ]
  },
]);
