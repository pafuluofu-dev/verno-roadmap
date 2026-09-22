import { ITEMS, TRACKS, UNI_DATE, type Item, type Track } from './data'

export interface Settings {
  /** ISO-дата старта расписания */
  start: string
  /** Часов в неделю на курсы, пока академ */
  hoursBefore: number
  /** Часов в неделю после возвращения в вуз */
  hoursAfter: number
  /** Доля недели, которая идёт треку A (0–100). Остаток — поровну между остальными треками */
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
  track: string
  items: ItemPlan[]
  total: number
  remaining: number
  done: number
  finish: Date | null
}

/** Фактически распределённые часы одной недели расписания */
export interface WeekLoad {
  start: Date
  hours: Record<string, number>
}

export interface Plan {
  start: Date
  tracks: Record<string, TrackPlan>
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

/** Доля недели трека в процентах для подписей: A — по ползунку, остаток поровну между остальными */
export function shareOf(trackId: string, settings: Settings, tracks: Track[]): number {
  if (trackId === 'A') return settings.shareA
  const rest = 100 - settings.shareA
  return tracks.length > 2 ? Math.round(rest / (tracks.length - 1)) : rest
}

/**
 * Раскладывает оставшиеся часы всех треков по неделям.
 * Каждая неделя делится между треками: A — по shareA, остаток поровну между остальными; часы
 * закрытых треков уходят незакрытым пропорционально их долям. Вехи закрываются датой предыдущего шага.
 */
export function buildPlan(
  settings: Settings,
  done: DoneMap,
  skipped: SkippedMap = {},
  progress: ProgressMap = {},
  items: Item[] = ITEMS,
  tracks: Track[] = TRACKS,
): Plan {
  const start = parseISO(settings.start)
  const uni = parseISO(UNI_DATE)
  const share = Math.min(100, Math.max(0, settings.shareA)) / 100
  const ids = tracks.map((track) => track.id)
  const others = Math.max(1, ids.length - 1)
  const weightOf = (t: string) => (t === 'A' ? share : (1 - share) / others)

  // Шаги, закрытые к текущей неделе: по ним разрешаются зависимости notBefore.
  const finished = new Set<string>()
  const blocked = (p: ItemPlan): boolean => {
    const id = p.item.notBefore
    if (!id || finished.has(id)) return false
    const blocker = items.find((candidate) => candidate.id === id)
    // Нет такого шага, он уже отмечен или вовсе не попал в расписание — ждать нечего.
    if (!blocker || isDone(blocker, done) || !isScheduled(blocker, settings, skipped)) return false
    return true
  }

  const queues: Record<string, ItemPlan[]> = {}
  const cursor: Record<string, number> = {}
  const lastFinish: Record<string, Date | null> = {}
  for (const t of ids) {
    queues[t] = []
    cursor[t] = 0
    lastFinish[t] = null
  }
  for (const item of items) {
    if (!queues[item.track]) continue
    const finished = isDone(item, done)
    // частично пройденный курс занимает в расписании только остаток часов
    const left = item.hours * (1 - progressOf(item, done, progress))
    queues[item.track].push({
      item,
      finish: null,
      remaining: finished || !isScheduled(item, settings, skipped) ? 0 : left,
    })
  }

  const remainingOf = (t: string) => queues[t].slice(cursor[t]).reduce((s, p) => s + p.remaining, 0)

  const settle = (t: string) => {
    const q = queues[t]
    while (cursor[t] < q.length) {
      const p = q[cursor[t]]
      if (p.remaining > 0) break
      // отмеченный шаг или веха: закрывается датой предыдущего
      if (p.item.kind === 'milestone' && !isDone(p.item, done)) p.finish = lastFinish[t]
      finished.add(p.item.id)
      cursor[t]++
    }
  }
  /** Трек ждёт чужой шаг: часы недели ему не нужны, их заберут остальные */
  const waiting = (t: string) => {
    const p = queues[t][cursor[t]]
    return p ? blocked(p) : false
  }

  const load: WeekLoad[] = []
  let week = 0
  const MAX_WEEKS = 260
  while (week < MAX_WEEKS && ids.some((t) => remainingOf(t) > 0)) {
    const weekStart = addDays(start, week * 7)
    const capacity = weekStart < uni ? settings.hoursBefore : settings.hoursAfter
    if (capacity <= 0) break
    for (const t of ids) settle(t)

    // номинал недели: A по ползунку, остаток поровну между остальными треками
    const hoursA = capacity * share
    const nominal: Record<string, number> = {}
    for (const t of ids) nominal[t] = t === 'A' ? hoursA : (capacity - hoursA) / others
    const active = ids.filter((t) => remainingOf(t) > 0 && !waiting(t))
    const budgets: Record<string, number> = {}
    for (const t of ids) budgets[t] = 0
    if (active.length === 0) {
      // все оставшиеся треки ждут чужих шагов — такого быть не должно, но цикл крутить незачем
      break
    } else if (active.length === 1) {
      // единственный незакрытый трек забирает всю неделю
      budgets[active[0]] = capacity
    } else {
      // часы закрытых треков — незакрытым, пропорционально их долям
      const spare = ids.filter((t) => !active.includes(t)).reduce((s, t) => s + nominal[t], 0)
      const activeWeight = active.reduce((s, t) => s + weightOf(t), 0)
      for (const t of active) budgets[t] = nominal[t] + (spare > 0 ? (activeWeight > 0 ? (spare * weightOf(t)) / activeWeight : spare / active.length) : 0)
    }

    const consumed: Record<string, number> = {}
    for (const t of ids) {
      let budget = budgets[t]
      const trackCapacity = budgets[t]
      const q = queues[t]
      while (budget > 0 && cursor[t] < q.length) {
        const p = q[cursor[t]]
        // Зависимость ещё не закрыта: трек ждёт, неделя остаётся неизрасходованной
        if (blocked(p)) break
        if (p.remaining <= 0) {
          // отмеченный шаг или веха: закрывается датой предыдущего
          if (p.item.kind === 'milestone' && !isDone(p.item, done)) p.finish = lastFinish[t]
          finished.add(p.item.id)
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
          finished.add(p.item.id)
          cursor[t]++
        }
      }
      consumed[t] = trackCapacity - budget
    }
    if (ids.some((t) => consumed[t] > 0.001)) load.push({ start: weekStart, hours: { ...consumed } })
    // Никто не сдвинулся: все оставшиеся треки заблокированы друг другом — дальше крутить бессмысленно
    else break
    week++
  }

  // хвост: вехи после последнего шага (если очередь закончилась без часов)
  for (const t of ids) {
    for (const p of queues[t]) {
      if (p.item.kind === 'milestone' && !p.finish && !isDone(p.item, done)) p.finish = lastFinish[t]
    }
  }

  const plans: Record<string, TrackPlan> = {}
  let end = start
  for (const t of ids) {
    const queue = queues[t]
    const counted = (p: ItemPlan) => isScheduled(p.item, settings, skipped) || isDone(p.item, done)
    const total = queue.reduce((s, p) => s + (counted(p) ? p.item.hours : 0), 0)
    const doneH = queue.reduce((s, p) => s + (counted(p) ? p.item.hours * progressOf(p.item, done, progress) : 0), 0)
    const finishDates = queue.filter((p) => p.finish).map((p) => p.finish as Date)
    const finish = finishDates.length ? new Date(Math.max(...finishDates.map((d) => d.getTime()))) : null
    if (finish && finish > end) end = finish
    plans[t] = { track: t, items: queue, total, remaining: total - doneH, done: doneH, finish }
  }

  const weeks = Math.max(0, Math.round((end.getTime() - start.getTime()) / (7 * 86400000)))
  return { start, tracks: plans, end, weeks, load }
}
