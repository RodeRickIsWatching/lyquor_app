import { erc20_cargo, erc20_rs } from "@/constants/template-rs"
import { create } from "zustand"

export type FileNode = {
  id: string
  name: string
  type: "file" | "folder"
  children?: FileNode[] | null
  content?: string
}

type CreateArgs = {
  parentId: string | null
  index: number
  type: "internal" | "leaf" // arborist 的语义：internal=文件夹，leaf=文件
}

type MoveArgs = {
  dragIds: string[]
  parentId: string | null
  index: number
}

type RenameArgs = {
  id: string
  name: string
}

type DeleteArgs = {
  ids: string[]
}

type WorkspaceState = {
  tree: FileNode[]
  selectedId?: string
  selectedFile?: FileNode
  selectFile: (file: FileNode | undefined) => void
  updateFileContent: (id: string, content: string) => void

  // 与 Arborist 事件一一对应（签名对齐官方）
  onCreate: (args: CreateArgs) => Promise<{ id: string } | null> | ({ id: string } | null)
  onMove: (args: MoveArgs) => void | Promise<void>
  onRename: (args: RenameArgs) => void | Promise<void>
  onDelete: (args: DeleteArgs) => void | Promise<void>
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

// —— 工具函数（不可变操作）——
function deepMap(nodes: FileNode[], f: (n: FileNode) => FileNode): FileNode[] {
  return nodes.map((n) =>
    f({
      ...n,
      children: Array.isArray(n.children) ? deepMap(n.children, f) : n.children ?? null,
    })
  )
}

function updateContent(nodes: FileNode[], id: string, content: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id && n.type === "file") return { ...n, content }
    if (Array.isArray(n.children)) return { ...n, children: updateContent(n.children, id, content) }
    return n
  })
}

function renameNode(nodes: FileNode[], id: string, name: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name }
    if (Array.isArray(n.children)) return { ...n, children: renameNode(n.children, id, name) }
    return n
  })
}

function removeByIds(nodes: FileNode[], ids: Set<string>, removed: FileNode[] = []): { tree: FileNode[]; removed: FileNode[] } {
  const res: FileNode[] = []
  for (const n of nodes) {
    if (ids.has(n.id)) {
      removed.push(n)
      continue
    }
    if (Array.isArray(n.children) && n.children.length) {
      const { tree: childNew, removed: childRemoved } = removeByIds(n.children, ids, removed)
      removed = childRemoved
      res.push({ ...n, children: childNew })
    } else {
      res.push(n)
    }
  }
  return { tree: res, removed }
}

function insertUnder(
  nodes: FileNode[],
  parentId: string | null,
  items: FileNode[],
  index: number
): FileNode[] {
  if (parentId === null) {
    const arr = nodes.slice()
    arr.splice(index, 0, ...items)
    return arr
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = Array.isArray(n.children) ? n.children.slice() : []
      children.splice(index, 0, ...items)
      return { ...n, children }
    }
    if (Array.isArray(n.children)) return { ...n, children: insertUnder(n.children, parentId, items, index) }
    return n
  })
}

function isDescendant(targetParentId: string, candidateId: string, nodes: FileNode[]): boolean {
  // 是否把节点拖到自己的子孙里
  let foundParent: FileNode | null = null
  const findById = (arr: FileNode[], id: string): FileNode | null => {
    for (const n of arr) {
      if (n.id === id) return n
      if (Array.isArray(n.children)) {
        const f = findById(n.children, id)
        if (f) return f
      }
    }
    return null
  }
  foundParent = findById(nodes, targetParentId)
  if (!foundParent || !Array.isArray(foundParent.children)) return false
  const stack = [...foundParent.children]
  while (stack.length) {
    const n = stack.pop()!
    if (n.id === candidateId) return true
    if (Array.isArray(n.children)) stack.push(...n.children)
  }
  return false
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // 初始数据
  tree: [
    {
      id: "1",
      name: "src",
      type: "folder",
      children: [
        { id: "2", name: "lib.rs", type: "file", content: erc20_rs },
      ],
    },
    {
        "id": "3",
        "name": "Cargo.toml",
        "type": "file",
        "content": erc20_cargo
    }
  ],
  selectedId: undefined,
  selectedFile: undefined,

  selectFile: (file?: FileNode) => {
    console.log('selectFile')
    set({ selectedFile: file, selectedId: file?.id })
  },

  updateFileContent: (id, content) => {
    console.log('updateFileContent')
    set((s) => ({
        tree: updateContent(s.tree, id, content),
      }))
  },

  // —— 与 Arborist 四个事件对齐 —— //
  onCreate: ({ parentId, index, type }) => {
    console.log('onCreate')
    const id = genId()
    const newNode: FileNode =
      type === "internal"
        ? { id, name: "", type: "folder", children: [] }
        : { id, name: "", type: "file", content: "" }

    set((s) => ({
      tree: insertUnder(s.tree, parentId, [newNode], index),
    }))

    // 返回新 id 供 Arborist 聚焦并进入编辑态（文档要求）
    return { id }
  },

  onMove: ({ dragIds, parentId, index }) => {
    console.log('onMove')
    const ids = new Set(dragIds)
    set((s) => {
      // 防御：不允许把节点拖进自己的后代
      if (parentId && dragIds.some((id) => isDescendant(id, parentId, s.tree))) {
        return {} as Partial<WorkspaceState>
      }
      const { tree: removedTree, removed } = removeByIds(s.tree, ids)
      const newTree = insertUnder(removedTree, parentId, removed, index)
      return { tree: newTree }
    })
  },

  onRename: ({ id, name }) => {
    console.log('onRename')
    set((s) => ({
        tree: renameNode(s.tree, id, name),
      }))
  },

  onDelete: ({ ids }) => {
    console.log('onDelete')
    set((s) => {
        const { tree } = removeByIds(s.tree, new Set(ids))
        const sel = s.selectedId && ids.includes(s.selectedId) ? undefined : s.selectedId
        return { tree, selectedId: sel }
      })
  },
}))
