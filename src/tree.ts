import type { Track } from './data'
import {
  fmtDate,
  fmtDateYear,
  fmtHours,
  isDone,
  isScheduled,
  type DoneMap,
  type ItemPlan,
  type Plan,
  type Settings,
  type SkippedMap,
  type TrackPlan,
} from './schedule'
import { isBuiltinTrack, trackLetter } from './trackStyle'

export interface TreeNode {
  id: string
  label: string
  /** Серая подпись справа: даты, часы, счётчик */
  meta?: string
  /** done — сделано; current — идёт сейчас; muted — отложено / по желанию; иначе обычный */
  status?: 'done' | 'current' | 'muted'
  /** Цветовая ветка трека: 'a' | 'b' | 'c' */
  branch?: 'a' | 'b' | 'c'
  /** Папка: ветку можно свернуть, даже когда внутри пусто — узел без детей пустой папкой не становится */
  folder?: boolean
  children: TreeNode[]
}

/** Этап — отрезок трека до ближайшей вехи; веха закрывает этап и служит его целью */
export interface Stage {
  n: number
  goal: ItemPlan | null
  steps: ItemPlan[]
}

/** Разбивка трека на этапы по вехам. Живёт здесь, а не в компоненте: этим делением пользуются и список шагов, и дерево */
export function buildStages(items: ItemPlan[]): Stage[] {
  const stages: Stage[] = []
  let current: ItemPlan[] = []
  for (const step of items) {
    if (step.item.kind === 'milestone') {
      stages.push({ n: stages.length + 1, goal: step, steps: current })
      current = []
    } else {
      current.push(step)
    }
  }
  if (current.length > 0) stages.push({ n: stages.length + 1, goal: null, steps: current })
  return stages
}

export const TREE_ROOT_LABEL = 'Маршрут verno/dev'

/** Шаг, которым занимаются прямо сейчас, — тот же, что показывает «Сейчас» на странице трека */
function currentStepId(trackPlan: TrackPlan, done: DoneMap, settings: Settings, skipped: SkippedMap): string | null {
  const next = trackPlan.items.find((step) => step.item.kind !== 'milestone' && !isDone(step.item, done) && isScheduled(step.item, settings, skipped))
  return next ? next.item.id : null
}

function stepNode(step: ItemPlan, branch: 'a' | 'b' | 'c', done: DoneMap, settings: Settings, skipped: SkippedMap, currentId: string | null): TreeNode {
  const item = step.item
  const finished = isDone(item, done)
  const parked = !!skipped[item.id]
  // «по желанию» при выключенном тумблере — шаг есть в плане, но вне расписания
  const scheduled = isScheduled(item, settings, skipped)
  const status: TreeNode['status'] = finished ? 'done' : item.id === currentId ? 'current' : parked || !scheduled ? 'muted' : undefined
  const meta = finished
    ? `${fmtHours(item.hours)} ч`
    : parked
      ? 'отложено'
      : !scheduled
        ? 'по желанию'
        : `${fmtHours(item.hours)} ч · к ${fmtDate(step.finish)}`

  return { id: item.id, label: item.title, meta, status, branch, children: [] }
}

function stageNode(
  stage: Stage,
  trackId: string,
  branch: 'a' | 'b' | 'c',
  done: DoneMap,
  settings: Settings,
  skipped: SkippedMap,
  currentId: string | null,
): TreeNode {
  // В знаменателе только шаги «в игре»: отложенные и «по желанию» из счёта уходят, как и из расписания
  const counted = stage.steps.filter((step) => isDone(step.item, done) || isScheduled(step.item, settings, skipped))
  const doneSteps = counted.filter((step) => isDone(step.item, done))
  const totalHours = counted.reduce((sum, step) => sum + step.item.hours, 0)
  const doneHours = doneSteps.reduce((sum, step) => sum + step.item.hours, 0)
  const allDone = counted.length > 0 && doneSteps.length === counted.length
  const holdsCurrent = currentId !== null && stage.steps.some((step) => step.item.id === currentId)

  return {
    id: `stage-${trackId}-${stage.goal ? stage.goal.item.id : 'tail'}`,
    label: `Этап ${stage.n} · ${stage.goal ? stage.goal.item.title : 'дальше, без отдельной вехи'}`,
    meta: `${doneSteps.length}/${counted.length} · ${fmtHours(doneHours)} из ${fmtHours(totalHours)} ч`,
    status: allDone ? 'done' : holdsCurrent ? 'current' : undefined,
    branch,
    folder: true,
    children: stage.steps.map((step) => stepNode(step, branch, done, settings, skipped, currentId)),
  }
}

function trackNode(track: Track, trackPlan: TrackPlan, done: DoneMap, settings: Settings, skipped: SkippedMap): TreeNode {
  const branch = trackLetter(track.id)
  const currentId = currentStepId(trackPlan, done, settings, skipped)
  const closed = trackPlan.total > 0 && trackPlan.total - trackPlan.done < 0.5

  return {
    id: `track-${track.id}`,
    label: isBuiltinTrack(track.id) ? `Трек ${track.id} · ${track.name}` : track.name,
    meta: `${fmtHours(trackPlan.done)} / ${fmtHours(trackPlan.total)} ч · финиш ${fmtDateYear(trackPlan.finish)}`,
    status: closed ? 'done' : undefined,
    branch,
    folder: true,
    children: buildStages(trackPlan.items).map((stage) => stageNode(stage, track.id, branch, done, settings, skipped, currentId)),
  }
}

/** Весь план одним деревом: корень → треки → этапы → шаги */
export function buildTree(plan: Plan, tracks: Track[], done: DoneMap, settings: Settings, skipped: SkippedMap): TreeNode {
  const children: TreeNode[] = []
  let total = 0
  let doneHours = 0
  for (const track of tracks) {
    const trackPlan = plan.tracks[track.id]
    // трек без расписания (только что создан и пуст) в дерево не попадает — рисовать нечего
    if (!trackPlan) continue
    total += trackPlan.total
    doneHours += trackPlan.done
    children.push(trackNode(track, trackPlan, done, settings, skipped))
  }
  const percent = total ? Math.round((doneHours / total) * 100) : 0

  return {
    id: 'root',
    label: TREE_ROOT_LABEL,
    meta: `${percent} % · сделано ${fmtHours(doneHours)} из ${fmtHours(total)} ч`,
    folder: true,
    children,
  }
}

/** Копия дерева без сделанного: узлы со status done и папки, где после чистки не осталось детей. Корень остаётся всегда */
export function pruneDone(root: TreeNode): TreeNode {
  return { ...root, children: root.children.map(pruneBranch).filter((node): node is TreeNode => node !== null) }
}

/* Фильтр убирает сделанные строки-листы; папка исчезает, только когда в ней не осталось видимых строк.
   Прятать папку по её собственному «сделано» нельзя: у этапа в знаменателе нет отложенных и «по желанию»,
   и вместе с ним пропали бы невыполненные шаги */
function pruneBranch(node: TreeNode): TreeNode | null {
  if (!node.folder) return node.status === 'done' ? null : node
  const children = node.children.map(pruneBranch).filter((child): child is TreeNode => child !== null)
  return children.length === 0 ? null : { ...node, children }
}
