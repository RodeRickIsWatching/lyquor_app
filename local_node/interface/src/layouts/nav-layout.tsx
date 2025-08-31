import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Outlet,
  useMatches,
} from "react-router";
import { Separator } from "@/components/ui/separator";
import { defaultPort } from "@/constants";
import { useLocalNodeMeta } from "@/hooks/use-local-node-meta";
import { useBlockUpdater } from "@/hooks/use-block-updater";

export default function NavLayout() {
  const matches = useMatches();
  useLocalNodeMeta(defaultPort);
  useBlockUpdater(defaultPort);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {matches?.map((item, index) => {
                return (
                  <>
                    {index != 0 ? (
                      <BreadcrumbSeparator className="hidden md:block" />
                    ) : null}
                    <BreadcrumbItem className="hidden md:block" key={index}>
                      <BreadcrumbLink href={item.pathname}>
                        {index > 0
                          ? item.pathname
                              .replace(matches?.[index - 1]?.pathname, "")
                              .replace("/", "")
                          : "Root"}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
