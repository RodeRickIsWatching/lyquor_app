import * as React from "react";
import {
  ArrowUpRightFromSquareIcon,
  Ban,
  Check,
  ChevronRight,
  Command,
  Moon,
  Pencil,
  Sun,
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
  SidebarFooter,
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
import { defaultPort } from "@/constants";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorageState } from "ahooks";

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
  tree: ["Lyquid", [`Port/${defaultPort}`]],
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
  // @ts-ignore
  const [theme, setTheme] = useLocalStorageState<any>("local-theme", { defaultValue: 'light', listenStorageChange: true });
  React.useEffect(() => {
    handleChange(theme, true)
  }, [])

  const handleChange = (v: string, stable: boolean = false) => {
    const newTheme = stable ? v : (theme === v)
      ? (v === 'light' ? 'dark' : 'light')
      : v;

    const root: any = document.querySelector('#root');
    if (!root) return;

    setTheme(newTheme);
    root.dataset.theme = newTheme;

    const opposite = newTheme === 'light' ? 'dark' : 'light';
    root.classList.remove(opposite);
    root.classList.add(newTheme);
  };


  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="dark:text-white text-black bg-sidebar-accent flex aspect-square size-8 items-center justify-center rounded-lg">
                  {/* <img src="/logo.svg" className="size-4" /> */}
                  <svg className="size-4" width="346" height="312" viewBox="0 0 346 312" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M341.576 90.0496C346.023 86.5138 346.335 79.8693 342.238 75.9333L297.195 32.659C293.032 28.6598 286.28 29.3298 282.985 34.0691L218.37 126.994C214.076 133.169 204.38 129.59 205.128 122.107L216.53 8.03623C217.183 1.50622 209.551 -2.49478 204.552 1.75643L152.447 46.0634C148.252 49.6304 145.835 54.859 145.835 60.3652V103.11C145.835 108.969 139.275 112.435 134.435 109.134L45.2347 48.2909C39.2431 44.204 31.0158 47.4058 29.3628 54.4677L17.1141 106.797C15.3712 114.243 19.6765 121.77 26.9781 124.044L84.7082 142.016C90.2902 143.754 91.6595 151.025 87.092 154.675L3.77869 221.237C-0.652981 224.777 -0.955882 231.409 3.13459 235.339L48.1957 278.631C52.3583 282.63 59.1102 281.96 62.4056 277.221L127.021 184.296C131.314 178.121 141.01 181.7 140.262 189.183L128.86 303.254C128.207 309.784 135.839 313.785 140.839 309.534L192.944 265.227C197.138 261.66 199.556 256.431 199.556 250.925V208.18C199.556 202.321 206.116 198.855 210.955 202.156L300.156 262.999C306.147 267.086 314.375 263.884 316.028 256.822L328.279 204.484C330.021 197.042 325.721 189.517 318.425 187.24L260.411 169.133C254.825 167.389 253.466 160.107 258.046 156.465L341.576 90.0496Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Lyquor</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
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
      <SidebarFooter>
        <SidebarContent>
          <Tabs value={theme} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger onClick={() => { handleChange('light') }} value="light"><Sun /></TabsTrigger>
              <TabsTrigger onClick={() => { handleChange('dark') }} value="dark"><Moon /></TabsTrigger>
            </TabsList>
          </Tabs>
        </SidebarContent>

      </SidebarFooter>
    </Sidebar>
  );
}

function Tree({ item, linkPrefix }: { item: TreeNode, linkPrefix?: string }) {
  const [name, ...items] = Array.isArray(item) ? item : [item];

  if (!items.length) {
    return (
      <>
        <Link to={"/" + (linkPrefix ? `${linkPrefix}/` : '') + name.toLowerCase()}>
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
              <Tree key={index} item={subItem as TreeNode} linkPrefix={name?.toLowerCase()} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
