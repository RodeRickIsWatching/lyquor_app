import NavLayout from "@/layouts/nav-layout";
import { ExplorerPage } from "@/page/explorer";
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
        element: <PlaygroundPage/>,
        children: [
          {
            path: ':id',
            element: <PlaygroundPage/>,
          },
        ]
      },
      
      {
        path: 'explorer',
        element: <ExplorerPage/>,
      },
    ]
  },
]);
  