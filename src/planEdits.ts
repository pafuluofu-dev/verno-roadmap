import { ITEMS, type Item, type Track } from './data'

/*
 * Правки плана владельца — наложение поверх src/data.ts, которое применяется при чтении:
 * исходные данные не меняются, «Вернуть исходный трек» просто стирает наложение.
 * Папка = этап трека и представлена своей вехой: id папки = id вехи, узлы папки = шаги перед ней.
 * Шаги после последней вехи — виртуальная папка 'tail': в layout она бывает, в addedFolders — никогда.
 */

export const TAIL_ID = 'tail'

export interface PlanLayout {
  /** Полный порядок папок и их узлов */
  folders: { id: string; nodes: string[] }[]
}

/** Что правится у вехи */
export interface FolderFields {
  title: string
  note: string
}

/** Что правится у шага; done остаётся как в данных */
export interface NodeFields {
  kind: 'course' | 'free' | 'practice'
  title: string
  meta?: string
  note: string
  hours: number
  video?: number
  factor?: number
  optional?: boolean
  url?: string
  units?: number
  unitWord?: string
  value?: number
}

export const NODE_KINDS: NodeFields['kind'][] = ['course', 'free', 'practice']
export const NODE_TEXT_KEYS = ['title', 'meta', 'note', 'url', 'unitWord'] as const
export const NODE_NUMBER_KEYS = ['hours', 'video', 'factor', 'units', 'value'] as const

export interface PlanEdits {
  /** Порядок этапов и шагов; null — исходный */
  layout: PlanLayout | null
  /** Правки встроенных вех по id: только изменённые поля */
  folders: Record<string, Partial<FolderFields>>
  /** Правки встроенных шагов по id: только изменённые поля */
  nodes: Record<string, Partial<NodeFields>>
  /** Свои вехи и шаги целиком */
  addedFolders: Record<string, FolderFields & { id: string }>
  addedNodes: Record<string, NodeFields & { id: string }>
  /** Удалённые встроенные вехи и шаги */
  deleted: string[]
}

export const EMPTY_EDITS: PlanEdits = { layout: null, folders: {}, nodes: {}, addedFolders: {}, addedNodes: {}, deleted: [] }

interface Folder {
  id: string
  nodes: string[]
}

export function hasEdits(edits: PlanEdits): boolean {
  return (
    edits.layout !== null ||
    Object.keys(edits.folders).length > 0 ||
    Object.keys(edits.nodes).length > 0 ||
    Object.keys(edits.addedFolders).length > 0 ||
    Object.keys(edits.addedNodes).length > 0 ||
    edits.deleted.length > 0
  )
}

/** Этапы по исходным данным: шаги до вехи — её папка, шаги после последней вехи — хвост */
function baseFolders(base: Item[]): Folder[] {
  const folders: Folder[] = []
  let nodes: string[] = []
  for (const item of base) {
    if (item.kind === 'milestone') {
      folders.push({ id: item.id, nodes })
      nodes = []
    } else {
      nodes.push(item.id)
    }
  }
  if (nodes.length > 0) folders.push({ id: TAIL_ID, nodes })
  return folders
}

/**
 * Итоговый порядок папок и узлов трека: layout владельца, сверенный с данными кода.
 * Неизвестные и удалённые id выпадают; новые вехи из кода встают в конец перед хвостом, новые шаги —
 * в конец своей исходной папки (без неё — в конец последней), поэтому обновление данных не теряет шагов.
 * Хвост всегда последний: он по определению «после последней вехи».
 */
export function resolveLayout(base: Item[], edits: PlanEdits): Folder[] {
  const byId = new Map(base.map((item) => [item.id, item]))
  const deleted = new Set(edits.deleted)
  const origin = baseFolders(base)
  const isFolder = (id: string) => id === TAIL_ID || byId.get(id)?.kind === 'milestone' || id in edits.addedFolders
  const isNode = (id: string) => {
    const item = byId.get(id)
    return item ? item.kind !== 'milestone' : id in edits.addedNodes
  }

  const folders: Folder[] = []
  const placed = new Set<string>()
  const has = (id: string) => folders.some((folder) => folder.id === id)
  const ensureTail = (): Folder => {
    let tail = folders.find((folder) => folder.id === TAIL_ID)
    if (!tail) {
      tail = { id: TAIL_ID, nodes: [] }
      folders.push(tail)
    }
    return tail
  }

  if (edits.layout) {
    for (const entry of edits.layout.folders) {
      if (!isFolder(entry.id) || deleted.has(entry.id) || has(entry.id)) continue
      const nodes: string[] = []
      for (const id of entry.nodes) {
        if (!isNode(id) || deleted.has(id) || placed.has(id)) continue
        placed.add(id)
        nodes.push(id)
      }
      folders.push({ id: entry.id, nodes })
    }
  } else {
    // без layout — исходный порядок; шаги удалённой вехи переходят к следующему этапу
    let carry: string[] = []
    for (const folder of origin) {
      const nodes = folder.nodes.filter((id) => !deleted.has(id))
      if (deleted.has(folder.id)) {
        carry.push(...nodes)
        continue
      }
      folders.push({ id: folder.id, nodes: [...carry, ...nodes] })
      carry = []
    }
    if (carry.length > 0) ensureTail().nodes.unshift(...carry)
    for (const folder of folders) for (const id of folder.nodes) placed.add(id)
  }

  // новые вехи из кода и свои вехи, выпавшие из layout (правленая руками копия), — в конец
  for (const folder of origin) if (folder.id !== TAIL_ID && !deleted.has(folder.id) && !has(folder.id)) folders.push({ id: folder.id, nodes: [] })
  for (const id of Object.keys(edits.addedFolders)) if (!has(id)) folders.push({ id, nodes: [] })
  const tailIndex = folders.findIndex((folder) => folder.id === TAIL_ID)
  if (tailIndex >= 0 && tailIndex !== folders.length - 1) folders.push(...folders.splice(tailIndex, 1))

  const place = (id: string, originId: string) => {
    placed.add(id)
    const home = folders.find((folder) => folder.id === originId)
    if (home) home.nodes.push(id)
    else if (originId === TAIL_ID || folders.length === 0) ensureTail().nodes.push(id)
    else folders[folders.length - 1].nodes.push(id)
  }
  for (const folder of origin) for (const id of folder.nodes) if (!placed.has(id) && !deleted.has(id)) place(id, folder.id)
  for (const id of Object.keys(edits.addedNodes)) if (!placed.has(id)) place(id, TAIL_ID)

  return folders
}

/** Итоговый плоский список шагов трека: для каждой папки её шаги, затем сама веха (у хвоста вехи нет) */
export function applyTrackEdits(baseItems: Item[], edits: PlanEdits, trackId: string): Item[] {
  const base = baseItems.filter((item) => item.track === trackId)
  const byId = new Map(base.map((item) => [item.id, item]))
  const items: Item[] = []
  for (const folder of resolveLayout(base, edits)) {
    for (const id of folder.nodes) {
      const own = byId.get(id)
      if (own) items.push({ ...own, ...edits.nodes[id] })
      else if (edits.addedNodes[id]) items.push({ ...edits.addedNodes[id], id, track: trackId })
    }
    if (folder.id === TAIL_ID) continue
    const own = byId.get(folder.id)
    const added = edits.addedFolders[folder.id]
    if (own) items.push({ ...own, ...edits.folders[folder.id] })
    else if (added) items.push({ id: folder.id, track: trackId, kind: 'milestone', title: added.title, note: added.note, hours: 0 })
  }
  return items
}

/** Итоговый ITEMS для всех треков — то, что идёт в расписание и на страницы */
export function effectiveItems(edits: Record<string, PlanEdits>, tracks: Track[], baseItems: Item[] = ITEMS): Item[] {
  return tracks.flatMap((track) => applyTrackEdits(baseItems, edits[track.id] ?? EMPTY_EDITS, track.id))
}

/* ───────────── операции редактора: чистые функции над правками одного трека ─────────────
   base — исходные шаги этого трека (ITEMS по track), нужны, чтобы материализовать layout из текущего
   итогового плана, пока он ещё null, и чтобы отличать встроенные id от своих. */

function withLayout(edits: PlanEdits, base: Item[], mutate: (folders: Folder[]) => void): PlanEdits {
  const folders = resolveLayout(base, edits).map((folder) => ({ id: folder.id, nodes: [...folder.nodes] }))
  mutate(folders)
  return { ...edits, layout: { folders } }
}

/** id по времени в base36: u-… шаг, f-… веха; два добавления в одну миллисекунду не сталкиваются */
function freshId(prefix: 'u' | 'f', edits: PlanEdits, base: Item[]): string {
  const taken = new Set([...base.map((item) => item.id), ...Object.keys(edits.addedNodes), ...Object.keys(edits.addedFolders), ...edits.deleted])
  let stamp = Date.now()
  let id = `${prefix}-${stamp.toString(36)}`
  while (taken.has(id)) id = `${prefix}-${(++stamp).toString(36)}`
  return id
}

function omit<T>(record: Record<string, T>, id: string): Record<string, T> {
  const copy = { ...record }
  delete copy[id]
  return copy
}

/** Новая веха: после указанной папки, иначе в конец списка вех — перед хвостом, его шаги остаются в хвосте */
export function addFolder(edits: PlanEdits, base: Item[], fields: FolderFields, afterFolderId?: string): PlanEdits {
  const id = freshId('f', edits, base)
  const next = withLayout(edits, base, (folders) => {
    const after = afterFolderId ? folders.findIndex((folder) => folder.id === afterFolderId) : -1
    const tail = folders.findIndex((folder) => folder.id === TAIL_ID)
    const index = after >= 0 ? after + 1 : tail >= 0 ? tail : folders.length
    folders.splice(index, 0, { id, nodes: [] })
  })
  return { ...next, addedFolders: { ...next.addedFolders, [id]: { ...fields, id } } }
}

export function updateFolder(edits: PlanEdits, id: string, patch: Partial<FolderFields>): PlanEdits {
  const added = edits.addedFolders[id]
  if (added) return { ...edits, addedFolders: { ...edits.addedFolders, [id]: { ...added, ...patch, id } } }
  return { ...edits, folders: { ...edits.folders, [id]: { ...edits.folders[id], ...patch } } }
}

/** Этап целиком со своими шагами на delta позиций; хвост не двигается и остаётся последним */
export function moveFolder(edits: PlanEdits, base: Item[], id: string, delta: number): PlanEdits {
  if (id === TAIL_ID) return edits
  return withLayout(edits, base, (folders) => {
    const from = folders.findIndex((folder) => folder.id === id)
    const to = from + delta
    const last = folders.filter((folder) => folder.id !== TAIL_ID).length - 1
    if (from < 0 || to < 0 || to > last || to === from) return
    const [folder] = folders.splice(from, 1)
    folders.splice(to, 0, folder)
  })
}

/** Удалить веху, сохранив содержимое: её шаги переходят в начало следующего этапа, без него — в хвост */
export function deleteFolder(edits: PlanEdits, base: Item[], id: string): PlanEdits {
  if (id === TAIL_ID) return edits
  const next = withLayout(edits, base, (folders) => {
    const index = folders.findIndex((folder) => folder.id === id)
    if (index < 0) return
    const [folder] = folders.splice(index, 1)
    let target = folders[index]
    if (!target) {
      target = { id: TAIL_ID, nodes: [] }
      folders.push(target)
    }
    target.nodes.unshift(...folder.nodes)
  })
  if (next.addedFolders[id]) return { ...next, addedFolders: omit(next.addedFolders, id) }
  if (!base.some((item) => item.id === id)) return next
  return { ...next, folders: omit(next.folders, id), deleted: next.deleted.includes(id) ? next.deleted : [...next.deleted, id] }
}

/** Новый шаг в папку (по умолчанию в конец); неизвестная папка — хвост */
export function addNode(edits: PlanEdits, base: Item[], folderId: string, fields: NodeFields, index?: number): PlanEdits {
  const id = freshId('u', edits, base)
  const next = withLayout(edits, base, (folders) => {
    let folder = folders.find((candidate) => candidate.id === folderId)
    if (!folder) {
      folder = folders.find((candidate) => candidate.id === TAIL_ID) ?? { id: TAIL_ID, nodes: [] }
      if (!folders.includes(folder)) folders.push(folder)
    }
    folder.nodes.splice(index ?? folder.nodes.length, 0, id)
  })
  return { ...next, addedNodes: { ...next.addedNodes, [id]: { ...fields, id } } }
}

export function updateNode(edits: PlanEdits, id: string, patch: Partial<NodeFields>): PlanEdits {
  const added = edits.addedNodes[id]
  if (added) return { ...edits, addedNodes: { ...edits.addedNodes, [id]: { ...added, ...patch, id } } }
  return { ...edits, nodes: { ...edits.nodes, [id]: { ...edits.nodes[id], ...patch } } }
}

/** Шаг на delta позиций внутри своей папки; у края — без изменений */
export function moveNode(edits: PlanEdits, base: Item[], id: string, delta: number): PlanEdits {
  return withLayout(edits, base, (folders) => {
    const folder = folders.find((candidate) => candidate.nodes.includes(id))
    if (!folder) return
    const from = folder.nodes.indexOf(id)
    const to = from + delta
    if (to < 0 || to >= folder.nodes.length) return
    folder.nodes.splice(from, 1)
    folder.nodes.splice(to, 0, id)
  })
}

/** Шаг в другую папку (по умолчанию в конец); хвост создаётся, если его ещё нет */
export function moveNodeToFolder(edits: PlanEdits, base: Item[], id: string, folderId: string, index?: number): PlanEdits {
  return withLayout(edits, base, (folders) => {
    const from = folders.find((candidate) => candidate.nodes.includes(id))
    if (!from) return
    let to = folders.find((candidate) => candidate.id === folderId)
    if (!to) {
      if (folderId !== TAIL_ID) return
      to = { id: TAIL_ID, nodes: [] }
      folders.push(to)
    }
    from.nodes.splice(from.nodes.indexOf(id), 1)
    to.nodes.splice(index ?? to.nodes.length, 0, id)
  })
}

/** Обмен позициями двух шагов, в том числе из разных этапов */
export function swapNodes(edits: PlanEdits, base: Item[], idA: string, idB: string): PlanEdits {
  if (idA === idB) return edits
  return withLayout(edits, base, (folders) => {
    const a = folders.find((candidate) => candidate.nodes.includes(idA))
    const b = folders.find((candidate) => candidate.nodes.includes(idB))
    if (!a || !b) return
    const indexA = a.nodes.indexOf(idA)
    const indexB = b.nodes.indexOf(idB)
    a.nodes[indexA] = idB
    b.nodes[indexB] = idA
  })
}

export function deleteNode(edits: PlanEdits, base: Item[], id: string): PlanEdits {
  const next = withLayout(edits, base, (folders) => {
    for (const folder of folders) {
      const index = folder.nodes.indexOf(id)
      if (index >= 0) folder.nodes.splice(index, 1)
    }
  })
  if (next.addedNodes[id]) return { ...next, addedNodes: omit(next.addedNodes, id), nodes: omit(next.nodes, id) }
  if (!base.some((item) => item.id === id)) return next
  return { ...next, nodes: omit(next.nodes, id), deleted: next.deleted.includes(id) ? next.deleted : [...next.deleted, id] }
}

export const resetEdits = (): PlanEdits => EMPTY_EDITS

/**
 * Патч встроенного шага по форме: только поля, отличные от текущих. Очищенное поле хранится пустым
 * ('' / 0 / false), а не undefined — JSON его потерял бы, и после перезагрузки вернулось бы исходное значение.
 */
export function diffNodeFields(current: Item, fields: NodeFields): Partial<NodeFields> {
  const patch: Partial<NodeFields> = {}
  if (fields.kind !== current.kind) patch.kind = fields.kind
  for (const key of NODE_TEXT_KEYS) if (fields[key] !== current[key]) patch[key] = fields[key] ?? ''
  for (const key of NODE_NUMBER_KEYS) if (fields[key] !== current[key]) patch[key] = fields[key] ?? 0
  if (!!fields.optional !== !!current.optional) patch.optional = !!fields.optional
  return patch
}

export function diffFolderFields(current: Item, fields: FolderFields): Partial<FolderFields> {
  const patch: Partial<FolderFields> = {}
  if (fields.title !== current.title) patch.title = fields.title
  if (fields.note !== current.note) patch.note = fields.note
  return patch
}
