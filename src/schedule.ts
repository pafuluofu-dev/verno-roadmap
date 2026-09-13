import { ITEMS, UNI_DATE, type Item, type TrackId } from './data'

export interface Settings {
  /** ISO-дата старта расписания */
  start: string
  /** Часов в неделю на курсы, пока академ */
  hoursBefore: number
  /** Часов в неделю после возвращения в вуз */
  hoursAfter: number
  /** Доля недели, которая идёт треку A (0–100). Остаток — треку B */
  shareA: number
  /** Ставить ли в расписание шаги «по желанию» */
  includeOptional: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  start: todayISO(),
  hoursBefore: 40,
  hoursAfter: 25,
  shareA: 70,
  includeOptional: false,
}

export type DoneMap = Record<string, boolean>

export interface ItemPlan {
  item: Item
  /** Дата, к которой шаг закрыт по расписанию (null — уже отмечен) */
  finish: Date | null
  remaining: number
}

export interface TrackPlan {
  track: TrackId
  items: ItemPlan[]
  total: number
  remaining: number
  done: number
  finish: Date | null
}

/** Фактически распределённые часы одной недели расписания */
export interface WeekLoad {
  start: Date
  hours: Record<TrackId, number>
}

export interface Plan {
  start: Date
  tracks: Record<TrackId, TrackPlan>
  end: Date
  weeks: number
  load: WeekLoad[]
}

export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const MONTHS_GEN = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

export function fmtDateYear(d: Date | null): string {
  if (!d) return '—'
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtHours(h: number): string {
  const r = Math.round(h)
  return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function isDone(item: Item, done: DoneMap): boolean {
  return !!item.done || !!done[item.id]
}

/** Отложенные пользователем шаги: id → true */
export type SkippedMap = Record<string, boolean>

/** Пройдено единиц по шагу: id → число уроков (или процентов, если уроки не посчитаны) */
export type ProgressMap = Record<string, number>

/** Сколько единиц в шаге. Нет счётчика уроков — считаем в процентах */
export function unitsOf(item: Item): number {
  return item.units && item.units > 0 ? item.units : 100
}

/** Пройдено единиц: ручная правка перевешивает авторскую заготовку в data.ts */
export function unitsDone(item: Item, progress: ProgressMap): number {
  const raw = progress[item.id]
  const value = Number.isFinite(raw) ? raw : item.unitsDone ?? 0
  return Math.min(unitsOf(item), Math.max(0, Math.round(value)))
}

/** Доля шага, закрытая вручную (0–1). Отмеченный галочкой шаг закрыт целиком */
export function progressOf(item: Item, done: DoneMap, progress: ProgressMap): number {
  if (isDone(item, done)) return 1
  return unitsDone(item, progress) / unitsOf(item)
}

/** Шаг участвует в расписании и в суммах часов */
export function isScheduled(item: Item, settings: Settings, skipped: SkippedMap = {}): boolean {
  return item.kind !== 'milestone' && (!item.optional || settings.includeOptional) && !skipped[item.id]
}

/**
 * Раскладывает оставшиеся часы обоих треков по неделям.
 * Каждая неделя делится между треками по shareA; когда один трек закончен,
 * вся неделя уходит второму. Вехи закрываются датой предыдущего шага.
 */
export function buildPlan(settings: Settings, done: DoneMap, skipped: SkippedMap = {}, progress: ProgressMap = {}): Plan {
  const start = parseISO(settings.start)
  const uni = parseISO(UNI_DATE)
  const share = Math.min(100, Math.max(0, settings.shareA)) / 100

  const queues: Record<TrackId, ItemPlan[]> = { A: [], B: [] }
  for (const item of ITEMS) {
    const finished = isDone(item, done)
    // частично пройденный курс занимает в расписании только остаток часов
    const left = item.hours * (1 - progressOf(item, done, progress))
    queues[item.track].push({
      item,
      finish: null,
      remaining: finished || !isScheduled(item, settings, skipped) ? 0 : left,
    })
  }

  const cursor: Record<TrackId, number> = { A: 0, B: 0 }
  const lastFinish: Record<TrackId, Date | null> = { A: null, B: null }
  const remainingOf = (t: TrackId) =>
    queues[t].slice(cursor[t]).reduce((s, p) => s + p.remaining, 0)

  const load: WeekLoad[] = []
  let week = 0
  const MAX_WEEKS = 260
  while (week < MAX_WEEKS && (remainingOf('A') > 0 || remainingOf('B') > 0)) {
    const weekStart = addDays(start, week * 7)
    const capacity = weekStart < uni ? settings.hoursBefore : settings.hoursAfter
    if (capacity <= 0) break

    const remA = remainingOf('A')
    const remB = remainingOf('B')
    let hoursA = capacity * share
    let hoursB = capacity - hoursA
    if (remA <= 0) { hoursB = capacity; hoursA = 0 }
    if (remB <= 0) { hoursA = capacity; hoursB = 0 }

    const budgets: Record<TrackId, number> = { A: hoursA, B: hoursB }
    const consumed: Record<TrackId, number> = { A: 0, B: 0 }
    for (const t of ['A', 'B'] as TrackId[]) {
      let budget = budgets[t]
      const trackCapacity = budgets[t]
      const q = queues[t]
      while (budget > 0 && cursor[t] < q.length) {
        const p = q[cursor[t]]
        if (p.remaining <= 0) {
          // отмеченный шаг или веха: закрывается датой предыдущего
          if (p.item.kind === 'milestone' && !isDone(p.item, done)) p.finish = lastFinish[t]
          cursor[t]++
          continue
        }
        const take = Math.min(budget, p.remaining)
        p.remaining -= take
        budget -= take
        if (p.remaining <= 0.001) {
          // доля недели, к которой шаг закрыт
          const used = trackCapacity - budget
          const frac = trackCapacity > 0 ? used / trackCapacity : 1
          p.finish = addDays(weekStart, Math.min(6, Math.round(frac * 6)))
          lastFinish[t] = p.finish
          p.remaining = 0
          cursor[t]++
        }
      }
      consumed[t] = trackCapacity - budget
    }
    if (consumed.A > 0.001 || consumed.B > 0.001) load.push({ start: weekStart, hours: { ...consumed } })
    week++
  }

  // хвост: вехи после последнего шага (если очередь закончилась без часов)
  for (const t of ['A', 'B'] as TrackId[]) {
    for (const p of queues[t]) {
      if (p.item.kind === 'milestone' && !p.finish && !isDone(p.item, done)) p.finish = lastFinish[t]
    }
  }

  const tracks = {} as Record<TrackId, TrackPlan>
  let end = start
  for (const t of ['A', 'B'] as TrackId[]) {
    const items = queues[t]
    const counted = (p: ItemPlan) => isScheduled(p.item, settings, skipped) || isDone(p.item, done)
    const total = items.reduce((s, p) => s + (counted(p) ? p.item.hours : 0), 0)
    const doneH = items.reduce((s, p) => s + (counted(p) ? p.item.hours * progressOf(p.item, done, progress) : 0), 0)
    const finishDates = items.filter((p) => p.finish).map((p) => p.finish as Date)
    const finish = finishDates.length ? new Date(Math.max(...finishDates.map((d) => d.getTime()))) : null
    if (finish && finish > end) end = finish
    tracks[t] = { track: t, items, total, remaining: total - doneH, done: doneH, finish }
  }

  const weeks = Math.max(0, Math.round((end.getTime() - start.getTime()) / (7 * 86400000)))
  return { start, tracks, end, weeks, load }
}
