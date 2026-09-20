import { DEFAULT_SETTINGS, type DoneMap, type ProgressMap, type Settings, type SkippedMap } from './schedule'
import type { UserNote } from './data/notebook'

export type { UserNote } from './data/notebook'

const DONE_KEY = 'verno-roadmap:done'
const SETTINGS_KEY = 'verno-roadmap:settings'
const SKIPPED_KEY = 'verno-roadmap:skipped'
const PROGRESS_KEY = 'verno-roadmap:progress'
const REMINDERS_DISMISSED_KEY = 'verno-roadmap:reminders-dismissed'
const REMINDERS_CUSTOM_KEY = 'verno-roadmap:reminders-custom'
const NOTES_KEY = 'verno-roadmap:notes'
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
