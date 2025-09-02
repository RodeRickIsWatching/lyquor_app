import NavLayout from "@/layouts/nav-layout";
import { ExplorerPage } from "@/page/explorer";
import { SpecificLyquidPage } from "@/page/lyquid/[lyquid_id]/page";
import { LyquidPage } from "@/page/lyquid/page";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <NavLayout />,
    children: [
      {
        index: true,
        element: <LyquidPage />,
      },
      {
        path: 'lyquid',
        element: <LyquidPage />,
        children: [
          {
            path: ':lyquid_id',
            element: <SpecificLyquidPage />,
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
