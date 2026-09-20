import { DEFAULT_SETTINGS, type DoneMap, type ProgressMap, type Settings, type SkippedMap } from './schedule'
import type { Track } from './data'
import type { UserNote } from './data/notebook'
import { hasEdits, NODE_KINDS, NODE_NUMBER_KEYS, NODE_TEXT_KEYS, type FolderFields, type NodeFields, type PlanEdits, type PlanLayout } from './planEdits'
import { isBuiltinTrack } from './trackStyle'

export type { UserNote } from './data/notebook'

const DONE_KEY = 'verno-roadmap:done'
const SETTINGS_KEY = 'verno-roadmap:settings'
const SKIPPED_KEY = 'verno-roadmap:skipped'
const PROGRESS_KEY = 'verno-roadmap:progress'
const REMINDERS_DISMISSED_KEY = 'verno-roadmap:reminders-dismissed'
const REMINDERS_CUSTOM_KEY = 'verno-roadmap:reminders-custom'
const NOTES_KEY = 'verno-roadmap:notes'
const PLAN_EDITS_KEY = 'verno-roadmap:plan-edits'
const TRACKS_KEY = 'verno-roadmap:tracks'
const THEME_KEY = 'verno-roadmap:theme'

export type Theme = 'dark' | 'light'

/** Тот же ключ читает инлайн-скрипт в index.html до первой отрисовки */
export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* см. ниже */
  }
}

export interface CustomReminder {
  id: string
  date: string
  text: string
}

export function loadDone(): DoneMap {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as DoneMap) : {}
  } catch {
    return {}
  }
}

export function saveDone(done: DoneMap): void {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(done))
  } catch {
    /* приватный режим или заблокированное хранилище — просто не сохраняем */
  }
}

export function loadSkipped(): SkippedMap {
  try {
    const raw = localStorage.getItem(SKIPPED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as SkippedMap) : {}
  } catch {
    return {}
  }
}

export function saveSkipped(skipped: SkippedMap): void {
  try {
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(skipped))
  } catch {
    /* см. выше */
  }
}

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const clean: ProgressMap = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(value)
      // ноль хранится наравне с остальными: он значит «сброшено вручную», а не «нет записи»
      if (Number.isFinite(n) && n >= 0) clean[id] = Math.round(n)
    }
    return clean
  } catch {
    return {}
  }
}

export function saveProgress(progress: ProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* см. выше */
  }
}

export function loadDismissedReminders(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(REMINDERS_DISMISSED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export function saveDismissedReminders(dismissed: Record<string, boolean>): void {
  try {
    localStorage.setItem(REMINDERS_DISMISSED_KEY, JSON.stringify(dismissed))
  } catch {
    /* см. выше */
  }
}

export function loadCustomReminders(): CustomReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_CUSTOM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is CustomReminder =>
        entry && typeof entry.id === 'string' && typeof entry.date === 'string' && typeof entry.text === 'string',
    )
  } catch {
    return []
  }
}

export function saveCustomReminders(reminders: CustomReminder[]): void {
  try {
    localStorage.setItem(REMINDERS_CUSTOM_KEY, JSON.stringify(reminders))
  } catch {
    /* см. выше */
  }
}

/* Заметки без дат (например, правленный руками файл копии) не выбрасываем — даты просто пустые */
export function sanitizeNotes(raw: unknown): UserNote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry): entry is UserNote => !!entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.body === 'string')
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      body: entry.body,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
    }))
}

/** Свои заметки владельца — страница «Заметки» */
export function loadNotes(): UserNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    return sanitizeNotes(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveNotes(notes: UserNote[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  } catch {
    /* см. выше */
  }
}

/* ───────────── правки плана и свои треки ───────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Поля шага из сырого объекта: только известные ключи правильного типа */
function pickNodeFields(raw: Record<string, unknown>): Partial<NodeFields> {
  const fields: Partial<NodeFields> = {}
  const kind = NODE_KINDS.find((candidate) => candidate === raw.kind)
  if (kind) fields.kind = kind
  for (const key of NODE_TEXT_KEYS) {
    const text = raw[key]
    if (typeof text === 'string') fields[key] = text
  }
  for (const key of NODE_NUMBER_KEYS) {
    const n = raw[key]
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) fields[key] = n
  }
  if (typeof raw.optional === 'boolean') fields.optional = raw.optional
  return fields
}

function pickFolderFields(raw: Record<string, unknown>): Partial<FolderFields> {
  const fields: Partial<FolderFields> = {}
  if (typeof raw.title === 'string') fields.title = raw.title
  if (typeof raw.note === 'string') fields.note = raw.note
  return fields
}

function sanitizeLayout(raw: unknown): PlanLayout | null {
  if (!isRecord(raw) || !Array.isArray(raw.folders)) return null
  const folders: PlanLayout['folders'] = []
  for (const entry of raw.folders) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !Array.isArray(entry.nodes)) continue
    folders.push({ id: entry.id, nodes: entry.nodes.filter((id): id is string => typeof id === 'string') })
  }
  return { folders }
}

function sanitizeRecord<T>(raw: unknown, pick: (id: string, value: Record<string, unknown>) => T | null): Record<string, T> {
  const clean: Record<string, T> = {}
  if (!isRecord(raw)) return clean
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue
    const picked = pick(id, value)
    if (picked) clean[id] = picked
  }
  return clean
}

/** Правки одного трека; битая запись — null. Старые копии без поля правок читаются как «правок нет» */
export function sanitizePlanEdits(raw: unknown): PlanEdits | null {
  if (!isRecord(raw)) return null
  return {
    layout: sanitizeLayout(raw.layout),
    folders: sanitizeRecord(raw.folders, (_id, value) => pickFolderFields(value)),
    nodes: sanitizeRecord(raw.nodes, (_id, value) => pickNodeFields(value)),
    addedFolders: sanitizeRecord(raw.addedFolders, (id, value) => {
      const fields = pickFolderFields(value)
      return fields.title === undefined ? null : { id, title: fields.title, note: fields.note ?? '' }
    }),
    addedNodes: sanitizeRecord(raw.addedNodes, (id, value) => {
      const fields = pickNodeFields(value)
      if (fields.kind === undefined || fields.title === undefined) return null
      return { ...fields, id, kind: fields.kind, title: fields.title, note: fields.note ?? '', hours: fields.hours ?? 0 }
    }),
    deleted: Array.isArray(raw.deleted) ? raw.deleted.filter((id): id is string => typeof id === 'string') : [],
  }
}

/** Правки по трекам: записи неизвестных треков и битые отбрасываются, пустые не хранятся */
export function sanitizePlanEditsMap(raw: unknown, trackIds: string[]): Record<string, PlanEdits> {
  const clean: Record<string, PlanEdits> = {}
  if (!isRecord(raw)) return clean
  for (const id of trackIds) {
    const edits = sanitizePlanEdits(raw[id])
    if (edits && hasEdits(edits)) clean[id] = edits
  }
  return clean
}

export function loadPlanEdits(trackIds: string[]): Record<string, PlanEdits> {
  try {
    const raw = localStorage.getItem(PLAN_EDITS_KEY)
    if (!raw) return {}
    return sanitizePlanEditsMap(JSON.parse(raw), trackIds)
  } catch {
    return {}
  }
}

export function savePlanEdits(edits: Record<string, PlanEdits>): void {
  try {
    localStorage.setItem(PLAN_EDITS_KEY, JSON.stringify(edits))
  } catch {
    /* см. выше */
  }
}

export const CUSTOM_TRACK_COLOR = 'var(--color-track-c)'

/** Свои треки: id встроенных и дубли не пропускаем, цвет у всех общий третий */
export function sanitizeCustomTracks(raw: unknown): Track[] {
  if (!Array.isArray(raw)) return []
  const tracks: Track[] = []
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id || typeof entry.name !== 'string') continue
    if (isBuiltinTrack(entry.id) || tracks.some((track) => track.id === entry.id)) continue
    tracks.push({ id: entry.id, name: entry.name, goal: typeof entry.goal === 'string' ? entry.goal : '', color: CUSTOM_TRACK_COLOR })
  }
  return tracks
}

export function loadCustomTracks(): Track[] {
  try {
    const raw = localStorage.getItem(TRACKS_KEY)
    if (!raw) return []
    return sanitizeCustomTracks(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveCustomTracks(tracks: Track[]): void {
  try {
    localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks))
  } catch {
    /* см. выше */
  }
}

export function sanitizeSettings(parsed: Partial<Settings> | null | undefined): Settings {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS
  return {
    start: typeof parsed.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.start) ? parsed.start : DEFAULT_SETTINGS.start,
    hoursBefore: clamp(Number(parsed.hoursBefore), 1, 80, DEFAULT_SETTINGS.hoursBefore),
    hoursAfter: clamp(Number(parsed.hoursAfter), 1, 80, DEFAULT_SETTINGS.hoursAfter),
    shareA: clamp(Number(parsed.shareA), 0, 100, DEFAULT_SETTINGS.shareA),
    includeOptional: typeof parsed.includeOptional === 'boolean' ? parsed.includeOptional : DEFAULT_SETTINGS.includeOptional,
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return sanitizeSettings(JSON.parse(raw) as Partial<Settings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* см. выше */
  }
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
