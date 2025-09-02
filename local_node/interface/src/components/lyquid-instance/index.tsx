import React, { useEffect } from "react";
import type { Abi, AbiFunction } from "viem";
import {
    decodeFunctionResult,
    encodeFunctionData,
    isAddress,
    parseEther,
} from "viem";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardAction,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Upload,
    Clipboard,
    Info,
    MoreVertical,
    Pencil,
    Trash2,
    Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lyquorTestnetHttp, lyquorTestnetPort } from "@/constants";
import { lyquidRpcCommands } from "@/utils/method-factory";
import { usePreLog } from "@/components/pre-log";
import { useWriteContract } from "@/hooks/use-write-contract";
import { lyquorTestnet } from "@/constants/chain";
import { useLocalNodeMetaStore, type LyquidItemMeta } from "@/hooks/use-local-node-meta";

// ---------------------------------------------------------------------
// helpers
const fnKey = (f: AbiFunction) =>
    `${f.name}(${f.inputs?.map((i) => i.type).join(",")})`;

function tryJson<T = any>(v: string): T {
    return JSON.parse(v);
}

function coerceArg(raw: string, type: string): any {
    if (raw === "" || raw == null) return undefined;
    try {
        if (type.endsWith("[]") || type.startsWith("tuple")) return tryJson(raw);
        if (type.startsWith("uint") || type.startsWith("int"))
            return raw.startsWith("0x") ? BigInt(raw) : BigInt(raw);
        if (type === "bool") return raw === "true" || raw === "1";
        return raw;
    } catch (e) {
        return raw;
    }
}

function pretty(x: any) {
    try {
        return JSON.stringify(x, null, 2);
    } catch {
        return String(x);
    }
}

function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------
// zustand store for ABI vault (persist to localStorage)
export type SavedAbi = {
    id: string;
    name: string;
    abi: Abi;
    createdAt: number;
};

type AbiVaultState = {
    items: SavedAbi[];
    currentId?: string;
    add: (name: string, abi: Abi) => string; // returns id
    remove: (id: string) => void;
    rename: (id: string, name: string) => void;
    select: (id?: string) => void;
    getById: (id?: string) => SavedAbi | undefined;
};

export const useAbiVault = create<AbiVaultState>()(
    persist(
        (set, get) => ({
            items: [],
            currentId: undefined,
            add: (name, abi) => {
                const id = uid();
                const entry: SavedAbi = {
                    id,
                    name: name || `ABI-${new Date().toISOString()}`,
                    abi,
                    createdAt: Date.now(),
                };
                set((s) => ({ items: [entry, ...s.items], currentId: id }));
                return id;
            },
            remove: (id) =>
                set((s) => ({
                    items: s.items.filter((x) => x.id !== id),
                    currentId: s.currentId === id ? undefined : s.currentId,
                })),
            rename: (id, name) =>
                set((s) => ({
                    items: s.items.map((x) => (x.id === id ? { ...x, name } : x)),
                })),
            select: (id) => set(() => ({ currentId: id })),
            getById: (id) => get().items.find((x) => x.id === id),
        }),
        {
            name: "abi-vault",
            storage: createJSONStorage(() => localStorage),
            version: 1,
        }
    )
);

// component
export function LyquidInstance({ lyquid_id }: any) {
    const { nodesByPort } = useLocalNodeMetaStore()
    const nodeMeta = lyquid_id ? (nodesByPort?.[lyquorTestnetPort]?.patch?.[lyquid_id] || {}) : {}

    const { lyquor_getLatestLyquidInfo = {} }: any = nodeMeta as LyquidItemMeta
    useEffect(() => {
        if (lyquor_getLatestLyquidInfo?.contract) {
            setContract(lyquor_getLatestLyquidInfo?.contract)
        }
    }, [lyquor_getLatestLyquidInfo?.contract])


    // pull from vault
    const { items, currentId, select, add, remove, rename, getById } =
        useAbiVault();

    // local ABI (reflects current selection)
    const currentAbi = getById(currentId)?.abi ?? null;
    const [abi, setAbi] = React.useState<Abi | null>(currentAbi);

    React.useEffect(() => {
        setAbi(currentAbi);
    }, [currentAbi]);

    // upload dialog states
    const [openUpload, setOpenUpload] = React.useState(false);
    const [abiPasteText, setAbiPasteText] = React.useState("");
    const [abiName, setAbiName] = React.useState("");
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const [contract, setContract] = React.useState("");

    // per-function inputs
    const [fnInputs, setFnInputs] = React.useState<
        Record<string, Record<string, string>>
    >({});

    const parseIncomingAbi = (json: any) => {
        const incoming = Array.isArray(json) ? json : json?.abi;
        if (!incoming || !Array.isArray(incoming))
            throw new Error("JSON 不包含 ABI 数组");
        return incoming as Abi;
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = String(ev.target?.result || "");
                const json = JSON.parse(text);
                const parsed = parseIncomingAbi(json);
                const name =
                    abiName || file.name.replace(/\.json$/i, "") || `ABI-${Date.now()}`;
                const id = add(name, parsed);
                select(id);
                appendLog(`[info] ABI loaded from file: ${name}`);
                setOpenUpload(false);
                setAbiPasteText("");
                setAbiName("");
            } catch (err: any) {
                appendLog("[error] 解析 ABI 失败: " + err.message);
            } finally {
                if (fileRef.current) fileRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const onLoadAbiFromPaste = () => {
        try {
            const json = JSON.parse(abiPasteText);
            const parsed = parseIncomingAbi(json);
            const name = abiName || `ABI-${new Date().toISOString()}`;
            const id = add(name, parsed);
            select(id);
            appendLog(`[info] ABI loaded from pasted JSON: ${name}`);
            setOpenUpload(false);
            setAbiPasteText("");
            setAbiName("");
        } catch (err: any) {
            alert("[error] 粘贴的 ABI JSON 无效: " + err.message);
        }
    };

    // logs
    const { appendLog, clearLog, PreLog } = usePreLog();
    const idRef = React.useRef<number>(1);

    const { writeContractAsync } = useWriteContract();

    const sendFn = async (fn: AbiFunction) => {
        if (!abi) return appendLog("[warn] 请先选择/上传 ABI");
        if (!contract) return appendLog("[warn] 请输入合约地址");
        if (!isAddress(contract))
            appendLog("[warn] 合约地址格式似乎不对（仍然尝试编码 data）");

        const key = fnKey(fn);

        // TODO typechain
        let args: any[] = [];
        try {
            args = (fn.inputs || []).map((i) =>
                coerceArg(fnInputs[key]?.[i.name || ""] ?? "", i.type)
            );
        } catch (err: any) {
            return appendLog(`[error] 参数解析失败: ${err.message}`);
        }

        for (let i = args.length - 1; i >= 0; i--) {
            if (args[i] === undefined) args.pop();
            else break;
        }

        const isRead =
            fn.stateMutability === "view" || fn.stateMutability === "pure";
        if (!isRead) {
            const { tx } = await writeContractAsync({
                abi,
                functionName: fn.name,
                args,
                chainId: lyquorTestnet.id,
                address: contract,
            });

            appendLog(`>> ${JSON.stringify(tx, (_, v) => typeof v === "bigint" ? v.toString() : v, 2)}`)
            return;
        }

        let encoded: `0x${string}`;
        try {
            encoded = encodeFunctionData({ abi, functionName: fn.name, args });
        } catch (err: any) {
            return appendLog(`[error] ABI 编码失败: ${err.message}`);
        }


        const txForCall = {
            from: undefined,
            to: contract,
            data: encoded,
            gas: undefined,
            value: undefined,
        } as const;

        const method = "eth_call";
        const params = [{ to: txForCall.to, data: txForCall.data }, "latest"];
        const id = idRef.current++;
        const cmd = lyquidRpcCommands[method];
        const payload = cmd.buildPayload(params, "ly_" + id, {
            lyquid_id: lyquid_id ?? "",
        });
        appendLog(`>> ${payload}`);
        const resp = await fetch(lyquorTestnetHttp, {
            method: "POST",
            body: payload,
        });

        const result = await resp.json();

        appendLog(`<< ${JSON.stringify(result, null, 2)}`);

        if (result?.result) {
            const decoded = decodeFunctionResult({
                abi,
                functionName: fn.name,
                data: result?.result,
            });
            appendLog(`<< decode: ${decoded}`);
        }
    };

    const functions: AbiFunction[] = React.useMemo(() => {
        return (
            (abi?.filter?.((i: any) => i?.type === "function") as AbiFunction[]) || []
        );
    }, [abi]);

    // rename & delete UI state
    const [renameOpen, setRenameOpen] = React.useState(false);
    const [newName, setNewName] = React.useState("");
    const [toDeleteId, setToDeleteId] = React.useState<string | undefined>(
        undefined
    );

    const currentItem = items.find((x) => x.id === currentId);

    return (
        <div className="text-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-4">
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader>
                    <CardTitle>ABI Functions</CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto space-y-4">
                    {/* Saved ABI selector row */}
                    <div className="flex items-center gap-2">
                        <Select value={currentId} onValueChange={(v) => select(v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select An ABI" />
                            </SelectTrigger>
                            <SelectContent>
                                {items?.length === 0 && (
                                    <div className="text-xs text-gray-500 text-center py-2">
                                        No ABIs
                                    </div>
                                )}
                                {items?.map((it) => (
                                    <SelectItem key={it.id} value={it.id}>
                                        {it.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Actions for current ABI */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuLabel>ABI</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (!currentItem) return;
                                        setNewName(currentItem.name);
                                        setRenameOpen(true);
                                    }}
                                    disabled={!currentItem}
                                >
                                    <Pencil className="w-4 h-4 mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setOpenUpload(true)}>
                                    <Upload className="w-4 h-4 mr-2" /> Create
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setToDeleteId(currentId)}
                                    disabled={!currentItem}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                        <Input
                            placeholder="Contract Address"
                            value={contract}
                            onChange={(e) => setContract(e.target.value)}
                        />
                    </div>

                    <Separator />

                    {!abi && (
                        <div className="text-muted-foreground text-xs">
                            No ABI has been selected.
                        </div>
                    )}

                    {abi && (
                        <Accordion type="multiple" className="space-y-2">
                            {functions.map((fn) => {
                                const key = fnKey(fn);
                                const inputMap = fnInputs[key] || {};
                                return (
                                    <AccordionItem key={key} value={key}>
                                        <AccordionTrigger className="flex items-center justify-between px-3 py-2 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Badge className="text-xs origin-left scale-75 -mr-2">
                                                    {fn.stateMutability}
                                                </Badge>
                                                <span className="font-medium text-sm">{fn.name}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Textarea
                                                className="!text-sm max-h-30"
                                                value={pretty(fn)}
                                            />
                                            <div className="space-y-2 mt-2">
                                                {(fn.inputs || []).map((p, idx) => (
                                                    <Input
                                                        key={`${key}-${p.name || idx}`}
                                                        placeholder={`${p.name || `arg${idx}`} (${p.type})`}
                                                        value={inputMap[p.name || `arg${idx}`] ?? ""}
                                                        onChange={(e) =>
                                                            setFnInputs((prev) => ({
                                                                ...prev,
                                                                [key]: {
                                                                    ...(prev[key] || {}),
                                                                    [p.name || `arg${idx}`]: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                ))}
                                                <Button
                                                    className="w-full mt-2 py-1 h-fit"
                                                    onClick={() => sendFn(fn)}
                                                >
                                                    Send
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Logs</CardTitle>
                    <CardDescription>Console Board</CardDescription>
                    <CardAction className="flex gap-2">
                        <Button variant="outline" onClick={clearLog}>
                            Clear Logs
                        </Button>
                    </CardAction>
                </CardHeader>
                <Separator />
                <CardContent className="h-full overflow-auto">
                    <div className="overflow-auto w-full h-full">{PreLog}</div>
                </CardContent>
            </Card>

            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
                <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Create</DialogTitle>
                        <DialogDescription>
                            Import via file or paste JSON and give it a name to make it easier to choose next time.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Input
                            placeholder="Name (Optional)"
                            value={abiName}
                            onChange={(e) => setAbiName(e.target.value)}
                        />
                    </div>

                    <Tabs defaultValue="file" className="mt-3">
                        <TabsList className="w-full">
                            <TabsTrigger value="file" className="w-1/2">
                                Upload
                            </TabsTrigger>
                            <TabsTrigger value="paste" className="w-1/2">
                                Paste JSON
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="file" className="pt-4">
                            <input
                                id="abi-uploader"
                                ref={fileRef}
                                type="file"
                                accept=".json,application/json"
                                placeholder="Upload"
                                className="hidden text-center border text-sm w-full p-2 rounded-md "
                                onChange={onFileSelected}
                            />
                            <label
                                htmlFor="abi-uploader"
                                className="relative block border rounded-md w-full px-4 py-10 text-center text-gray-500"
                            >
                                <Upload className="size-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </label>
                        </TabsContent>

                        <TabsContent value="paste" className="pt-4 space-y-2">
                            <Textarea
                                className="!text-xs max-h-[220px] overflow-auto break-all"
                                placeholder="[]"
                                value={abiPasteText}
                                onChange={(e) => setAbiPasteText(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <Button onClick={onLoadAbiFromPaste}>
                                    <Clipboard className="w-4 h-4 mr-2" /> Save
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="New Name"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                if (!currentId) return;
                                rename(currentId, newName || currentItem?.name || "Unnamed");
                                setRenameOpen(false);
                            }}
                        >
                            <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!toDeleteId}
                onOpenChange={(open) => !open && setToDeleteId(undefined)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove ABI？</AlertDialogTitle>
                        <AlertDialogDescription>
                            This operation only deletes locally saved records and does not affect the chain or other files.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setToDeleteId(undefined)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (toDeleteId) remove(toDeleteId);
                                setToDeleteId(undefined);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
