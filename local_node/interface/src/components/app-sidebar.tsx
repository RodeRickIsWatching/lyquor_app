import * as React from "react";
import {
  ArrowUpRightFromSquareIcon,
  Ban,
  Check,
  ChevronRight,
  Command,
  Pencil,
  X,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePlaygroundTree } from "@/stores/playground-tree-store";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

// This is sample data.
const data = {
  links: [
    {
      file: "Home",
      url: "https://lyquor.xyz/",
      state: <ArrowUpRightFromSquareIcon className="size-3" />,
    },
    {
      file: "Doc",
      url: "https://docs.lyquor.dev/docs/litepaper/intro/",
      state: <ArrowUpRightFromSquareIcon className="size-3" />,
    },
  ],
  tree: ["Explorer"],
};

// 树节点类型定义，避免 any
type TreeNode = string | [string, ...TreeNode[]];

const PlaygroundMenu = React.memo(() => {
  const navigate = useNavigate();
  const playgrounds = usePlaygroundTree((state) => state.playgrounds);
  const rename = usePlaygroundTree((state) => state.renamePlayground);
  const remove = usePlaygroundTree((state) => state.removePlayground);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (id: string, prev: string) => {
    setEditingId(id);
    setEditingValue(prev);
  };

  const commitEdit = (id: string, prev: string) => {
    const next = editingValue.trim();
    if (next && next !== prev) {
      rename(id, next);
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    // 使用 rAF 确保本次点击不会“落到”切换后的按钮上
    requestAnimationFrame(() => setEditingId(null));
  };

  const handleRemove = (id: string) => {
    remove(id);
  };

  if (!playgrounds || playgrounds.length === 0) {
    return (
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
          defaultOpen
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <ChevronRight className="transition-transform" />
              Playground
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="transition-transform" />
            Playground
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {playgrounds.map((t) => (
              <SidebarMenuItem key={t.id} className="flex items-center">
                <SidebarMenuButton
                  onClick={() => {
                    if (editingId !== t.id) navigate(`/playground/${t.id}`);
                  }}
                  className="flex-1 data-[active=true]:bg-transparent truncate"
                >
                  {editingId === t.id ? (
                    <input
                      ref={inputRef}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          commitEdit(t.id, t.name);
                        } else if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      onBlur={() => commitEdit(t.id, t.name)}
                      className="w-full bg-transparent outline-none border border-input rounded px-1 h-6 text-sm truncate"
                    />
                  ) : (
                    <span className="truncate max-w-[140px]" title={t.name}>
                      {t.name}
                    </span>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    {editingId === t.id ? (
                      <>
                        <Button
                          className="!p-1 h-fit"
                          variant="outline"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => commitEdit(t.id, t.name)}
                        >
                          <Check className="size-3 text-green-500" />
                        </Button>
                        <Button
                          className="!p-1 h-fit"
                          variant="outline"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => cancelEdit()}
                        >
                          <Ban className="size-3 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className="!p-1 h-fit"
                          variant="outline"
                          aria-label="rename"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => startEdit(t.id, t.name)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          className="!p-1 h-fit"
                          variant="outline"
                          aria-label="remove"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => handleRemove(t.id)}
                        >
                          <X className="size-3 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
});

PlaygroundMenu.displayName = "PlaygroundMenu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Lyquor</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Get Started</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.links.map((item, index) => (
                <a href={item.url} target="_blank" key={index}>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="!cursor-pointer truncate">
                      <span className="truncate max-w-[160px]">{item.file}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{item.state}</SidebarMenuBadge>
                  </SidebarMenuItem>
                </a>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Routes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <PlaygroundMenu />
              {data.tree.map((item, index) => (
                <Tree key={index} item={item as TreeNode} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function Tree({ item }: { item: TreeNode }) {
  const [name, ...items] = Array.isArray(item) ? item : [item];

  if (!items.length) {
    return (
      <>
        <Link to={"/" + name.toLowerCase()}>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={name === "button.tsx"}
              className="data-[active=true]:bg-transparent truncate"
            >
              <span className="truncate max-w-[160px]">{name}</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>
              <ChevronRight className="size-3" />
            </SidebarMenuBadge>
          </SidebarMenuItem>
        </Link>
      </>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="transition-transform" />
            {name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <Tree key={index} item={subItem as TreeNode} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
