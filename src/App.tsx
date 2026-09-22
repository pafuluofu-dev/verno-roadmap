import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ITEMS, TRACKS, type Track } from './data'
import { buildPlan, unitsOf, type DoneMap, type ProgressMap, type Settings, type SkippedMap } from './schedule'
import { effectiveItems, EMPTY_EDITS, hasEdits, type PlanEdits } from './planEdits'
import { isBuiltinTrack } from './trackStyle'
import {
  CUSTOM_TRACK_COLOR,
  loadCustomReminders,
  loadCustomTracks,
  loadDismissedReminders,
  loadDone,
  loadNotes,
  markSeedNotesSeen,
  loadPlanEdits,
  loadProgress,
  loadSettings,
  loadSkipped,
  saveCustomReminders,
  saveCustomTracks,
  saveDismissedReminders,
  saveDone,
  saveNotes,
  savePlanEdits,
  saveProgress,
  saveSettings,
  loadTheme,
  saveSkipped,
  saveTheme,
  sanitizeCustomTracks,
  sanitizeNotes,
  sanitizePlanEditsMap,
  sanitizeSettings,
  type CustomReminder,
  type Theme,
  type UserNote,
} from './storage'
import { AppNav } from './components/AppNav'
import { Hero } from './components/Hero'
import { Recommendation } from './components/Recommendation'
import { LoadChart } from './components/LoadChart'
import { ScheduleControls } from './components/ScheduleControls'
import { Timeline } from './components/Timeline'
import { TrackCard } from './components/TrackCard'
import { TrackPage } from './components/TrackPage'
import { OverallProgress } from './components/OverallProgress'
import { SkippedPage } from './components/SkippedPage'
import { BackupSection } from './components/BackupSection'
import { FolderForm } from './components/PlanEditor'
import { buildReminderViews, countDueReminders, ReminderBanner, RemindersSection } from './components/Reminders'
import { ROUTE_META, routeMeta, trackHash, trackIdOf, useRoute, type Route } from './router'

// KaTeX весит ~260 КБ — тянем его только на страницу заметок, чтобы галочки на треках открывались мгновенно
const NotebookPage = lazy(() => import('./components/NotebookPage').then((module) => ({ default: module.NotebookPage })))
// Дерево нужно на одной странице из шести, и генератор SVG нужен только там — отдельным куском
const TreePage = lazy(() => import('./components/TreePage').then((module) => ({ default: module.TreePage })))

const TRACK_LABELS = { heading: 'Свой трек', title: 'Название', note: 'Цель' }

/** Копия словаря без указанных ключей — так стираются галочки и счётчики шагов удалённого трека */
function withoutKeys<T>(map: Record<string, T>, keys: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(map).filter(([id]) => !keys.has(id)))
}

export default function App() {
  const [done, setDone] = useState<DoneMap>(loadDone)
  const [skipped, setSkipped] = useState<SkippedMap>(loadSkipped)
  const [progress, setProgressMap] = useState<ProgressMap>(loadProgress)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [dismissedReminders, setDismissedReminders] = useState<Record<string, boolean>>(loadDismissedReminders)
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>(loadCustomReminders)
  const [notes, setNotes] = useState<UserNote[]>(loadNotes)
  const [customTracks, setCustomTracks] = useState<Track[]>(loadCustomTracks)
  // правки читаются после списка треков: записи неизвестных треков отбрасываются
  const [planEdits, setPlanEdits] = useState<Record<string, PlanEdits>>(() => loadPlanEdits([...TRACKS, ...customTracks].map((track) => track.id)))
  const [trackForm, setTrackForm] = useState(false)
  const [pendingReminderScroll, setPendingReminderScroll] = useState(false)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const route = useRoute()
  const pageRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => saveDone(done), [done])
  useEffect(() => saveSkipped(skipped), [skipped])
  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveDismissedReminders(dismissedReminders), [dismissedReminders])
  useEffect(() => saveCustomReminders(customReminders), [customReminders])
  useEffect(() => saveNotes(notes), [notes])
  // стартовые заметки выдаются один раз: список показанных пишется после того,
  // как loadNotes их уже вернул, — сами заметки сохранит эффект строкой выше
  useEffect(() => markSeedNotesSeen(), [])
  useEffect(() => saveCustomTracks(customTracks), [customTracks])
  useEffect(() => savePlanEdits(planEdits), [planEdits])

  useEffect(() => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
    saveTheme(theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f8f3' : '#0d0d0d')
  }, [theme])

  const allTracks = useMemo(() => [...TRACKS, ...customTracks], [customTracks])
  // итоговые шаги: данные кода с наложенными правками владельца
  const items = useMemo(() => effectiveItems(planEdits, allTracks), [planEdits, allTracks])

  const routeTrackId = trackIdOf(route)
  const routeTrack = routeTrackId === null ? undefined : allTracks.find((track) => track.id === routeTrackId)
  // Неизвестный трек — удалён или ссылка с другого устройства — ведёт на обзор
  const page: Route = routeTrackId !== null && !routeTrack ? 'home' : route

  useEffect(() => {
    document.title = routeMeta(page, allTracks).title
  }, [page, allTracks])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    pageRef.current?.focus({ preventScroll: true })
  }, [page])

  useEffect(() => {
    if (pendingReminderScroll && page === 'home') {
      document.getElementById('reminders-title')?.scrollIntoView({ block: 'start' })
      setPendingReminderScroll(false)
    }
  }, [pendingReminderScroll, page])

  const plan = useMemo(() => buildPlan(settings, done, skipped, progress, items, allTracks), [settings, done, skipped, progress, items, allTracks])
  const baseItems = useMemo(() => (routeTrack ? ITEMS.filter((item) => item.track === routeTrack.id) : []), [routeTrack])

  const toggleStep = (id: string) =>
    setDone((previous) => {
      const next = { ...previous }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })

  const toggleSkip = (id: string) =>
    setSkipped((previous) => {
      const next = { ...previous }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })

  const setStepProgress = (id: string, value: number) => {
    const item = items.find((candidate) => candidate.id === id)
    if (!item) return
    const next = Math.min(unitsOf(item), Math.max(0, Math.round(Number(value) || 0)))
    // ноль записываем явно: без записи шаг откатится к заготовке из data.ts
    setProgressMap((previous) => ({ ...previous, [id]: next }))
  }

  const resetProgress = () => {
    if (window.confirm('Снять все галочки и счётчики пройденного? Настройки и отложенные шаги останутся.')) {
      setDone({})
      setProgressMap({})
    }
  }

  const reminders = useMemo(() => buildReminderViews(customReminders), [customReminders])

  const toggleReminderDismiss = (id: string) =>
    setDismissedReminders((previous) => {
      const next = { ...previous }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })

  const addReminder = (date: string, text: string) =>
    setCustomReminders((previous) => [...previous, { id: `custom-${Date.now().toString(36)}`, date, text }])

  const deleteReminder = (id: string) => {
    setCustomReminders((previous) => previous.filter((reminder) => reminder.id !== id))
    setDismissedReminders((previous) => {
      if (!previous[id]) return previous
      const next = { ...previous }
      delete next[id]
      return next
    })
  }

  const openReminders = () => {
    if (page !== 'home') window.location.hash = ROUTE_META.home.hash
    setPendingReminderScroll(true)
  }

  const saveNote = (note: UserNote) =>
    setNotes((previous) => (previous.some((entry) => entry.id === note.id) ? previous.map((entry) => (entry.id === note.id ? note : entry)) : [note, ...previous]))

  const deleteNote = (id: string) => setNotes((previous) => previous.filter((entry) => entry.id !== id))

  const setTrackEdits = (trackId: string, edits: PlanEdits) =>
    setPlanEdits((previous) => {
      const next = { ...previous }
      if (hasEdits(edits)) next[trackId] = edits
      else delete next[trackId]
      return next
    })

  const createTrack = (name: string, goal: string) => {
    const id = `t-${Date.now().toString(36)}`
    setCustomTracks((previous) => [...previous, { id, name, goal, color: CUSTOM_TRACK_COLOR }])
    setTrackForm(false)
    window.location.hash = trackHash(id)
  }

  const deleteTrack = (track: Track) => {
    if (!window.confirm(`Удалить трек «${track.name}»? Его шаги, правки и галочки будут стёрты.`)) return
    const own = new Set(items.filter((item) => item.track === track.id).map((item) => item.id))
    setDone((previous) => withoutKeys(previous, own))
    setSkipped((previous) => withoutKeys(previous, own))
    setProgressMap((previous) => withoutKeys(previous, own))
    setPlanEdits((previous) => withoutKeys(previous, new Set([track.id])))
    setCustomTracks((previous) => previous.filter((candidate) => candidate.id !== track.id))
    window.location.hash = ROUTE_META.home.hash
  }

  const exportData = () => JSON.stringify({ v: 1, done, skipped, progress, settings, customReminders, dismissedReminders, notes, customTracks, planEdits })

  const importData = (raw: string): boolean => {
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return false
      if (parsed.done && typeof parsed.done === 'object') setDone(parsed.done as DoneMap)
      if (parsed.skipped && typeof parsed.skipped === 'object') setSkipped(parsed.skipped as SkippedMap)
      if (parsed.progress && typeof parsed.progress === 'object') {
        const clean: ProgressMap = {}
        for (const [id, value] of Object.entries(parsed.progress as Record<string, unknown>)) {
          const n = Number(value)
          if (Number.isFinite(n) && n >= 0) clean[id] = Math.round(n)
        }
        setProgressMap(clean)
      }
      if (parsed.settings) setSettings(sanitizeSettings(parsed.settings))
      if (Array.isArray(parsed.customReminders))
        setCustomReminders(
          parsed.customReminders.filter(
            (entry: unknown): entry is CustomReminder =>
              !!entry &&
              typeof (entry as CustomReminder).id === 'string' &&
              typeof (entry as CustomReminder).date === 'string' &&
              typeof (entry as CustomReminder).text === 'string',
          ),
        )
      if (parsed.dismissedReminders && typeof parsed.dismissedReminders === 'object')
        setDismissedReminders(parsed.dismissedReminders as Record<string, boolean>)
      if (Array.isArray(parsed.notes)) setNotes(sanitizeNotes(parsed.notes))
      // копия без своих треков и правок читается как «их нет» — они заменяются целиком, как и галочки
      const tracks = sanitizeCustomTracks(parsed.customTracks)
      setCustomTracks(tracks)
      setPlanEdits(sanitizePlanEditsMap(parsed.planEdits, [...TRACKS, ...tracks].map((track) => track.id)))
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="container">
      <AppNav
        route={page}
        plan={plan}
        tracks={allTracks}
        dueReminders={countDueReminders(reminders, dismissedReminders)}
        onBellClick={openReminders}
        theme={theme}
        onToggleTheme={() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))}
      />
      <ReminderBanner reminders={reminders} dismissed={dismissedReminders} onDismiss={toggleReminderDismiss} />
      <div className="page" ref={pageRef} tabIndex={-1}>
        {page === 'home' ? (
          <>
            <Hero plan={plan} tracks={allTracks} />
            <main>
              <Recommendation plan={plan} settings={settings} done={done} skipped={skipped} items={items} tracks={allTracks} onChange={setSettings} />
              <section className="page-section" aria-labelledby="tracks-title">
                <div className="page-section__header">
                  <h2 id="tracks-title">Треки</h2>
                  <p className="section-lead">Полные списки шагов с галочками — на страницах треков.</p>
                </div>
                <div className="track-cards">
                  {allTracks.map((track) => (
                    <TrackCard key={track.id} track={track} tracks={allTracks} trackPlan={plan.tracks[track.id]} done={done} skipped={skipped} settings={settings} />
                  ))}
                </div>
                <div className="editor-add editor-add--section">
                  {trackForm ? (
                    <FolderForm
                      idPrefix="new-track"
                      labels={TRACK_LABELS}
                      submitLabel="Создать трек"
                      card
                      onSave={(fields) => createTrack(fields.title, fields.note)}
                      onCancel={() => setTrackForm(false)}
                    />
                  ) : (
                    <div className="editor-add__actions">
                      <button type="button" className="button" onClick={() => setTrackForm(true)}>
                        + Свой трек
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <ScheduleControls settings={settings} tracks={allTracks} onChange={setSettings} onResetProgress={resetProgress} />
              <Timeline plan={plan} tracks={allTracks} />
              <LoadChart plan={plan} settings={settings} tracks={allTracks} />
              <RemindersSection
                reminders={reminders}
                dismissed={dismissedReminders}
                onToggleDismiss={toggleReminderDismiss}
                onAdd={addReminder}
                onDelete={deleteReminder}
              />
              <BackupSection onExport={exportData} onImport={importData} />
              <section className="page-section" aria-labelledby="skipped-links-title">
                <div className="page-section__header">
                  <h2 id="skipped-links-title">Мимо плана</h2>
                  <p className="section-lead">
                    Курсы из библиотеки, которые не стали шагами, — с вероятностью, что понадобятся, и условием возврата:{' '}
                    <a href={ROUTE_META.skippedA.hash}>фриланс</a> · <a href={ROUTE_META.skippedB.hash}>fullstack</a> ·{' '}
                    <a href={ROUTE_META.skippedC.hash}>iGaming</a>.
                  </p>
                </div>
              </section>
            </main>
          </>
        ) : page === 'notebook' ? (
          <Suspense fallback={<p className="page-loading">Загружаю заметки…</p>}>
            <NotebookPage notes={notes} onSave={saveNote} onDelete={deleteNote} />
          </Suspense>
        ) : page === 'tree' ? (
          <Suspense fallback={<p className="page-loading">Строю дерево…</p>}>
            <TreePage plan={plan} tracks={allTracks} done={done} skipped={skipped} settings={settings} />
          </Suspense>
        ) : page === 'skippedA' || page === 'skippedB' || page === 'skippedC' ? (
          <SkippedPage trackId={page === 'skippedA' ? 'A' : page === 'skippedB' ? 'B' : 'C'} />
        ) : routeTrack ? (
          <TrackPage
            key={routeTrack.id}
            track={routeTrack}
            tracks={allTracks}
            plan={plan}
            done={done}
            skipped={skipped}
            settings={settings}
            progress={progress}
            onToggle={toggleStep}
            onSkip={toggleSkip}
            onProgress={setStepProgress}
            edits={planEdits[routeTrack.id] ?? EMPTY_EDITS}
            baseItems={baseItems}
            onEdits={(edits) => setTrackEdits(routeTrack.id, edits)}
            onDeleteTrack={isBuiltinTrack(routeTrack.id) ? undefined : () => deleteTrack(routeTrack)}
          />
        ) : null}
      </div>
      {page !== 'home' && <OverallProgress plan={plan} />}
      <footer className="site-footer">
        <p>
          Часы работы = видео × коэффициент: курсы с кодом ×2, no-code и дизайн ×1,5, справочные ×1,2. Длительности — из библиотеки Udemy на 2 сентября 2026 и оценок Stepik на 13 сентября (там часы — оценка платформы вместе с задачами, без коэффициента),
          цены услуг — с verno-dev.com. Бесплатные материалы (Битрикс, NextPizza, SQL, GetCourse) оценены приблизительно — поправь по факту.
        </p>
        <p>
          Галочки, счётчики пройденного, настройки и заметки хранятся в этом браузере (localStorage) и не синхронизируются между устройствами — для переноса есть экспорт и импорт
          ниже.
        </p>
      </footer>
    </div>
  )
}
