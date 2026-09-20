import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ITEMS, TRACKS } from './data'
import { buildPlan, unitsOf, type DoneMap, type ProgressMap, type Settings, type SkippedMap } from './schedule'
import {
  loadCustomReminders,
  loadDismissedReminders,
  loadDone,
  loadNotes,
  loadProgress,
  loadSettings,
  loadSkipped,
  saveCustomReminders,
  saveDismissedReminders,
  saveDone,
  saveNotes,
  saveProgress,
  saveSettings,
  loadTheme,
  saveSkipped,
  saveTheme,
  sanitizeNotes,
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
import { buildReminderViews, countDueReminders, ReminderBanner, RemindersSection } from './components/Reminders'
import { ROUTE_META, useRoute } from './router'

// KaTeX весит ~260 КБ — тянем его только на страницу заметок, чтобы галочки на треках открывались мгновенно
const NotebookPage = lazy(() => import('./components/NotebookPage').then((module) => ({ default: module.NotebookPage })))

export default function App() {
  const [done, setDone] = useState<DoneMap>(loadDone)
  const [skipped, setSkipped] = useState<SkippedMap>(loadSkipped)
  const [progress, setProgressMap] = useState<ProgressMap>(loadProgress)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [dismissedReminders, setDismissedReminders] = useState<Record<string, boolean>>(loadDismissedReminders)
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>(loadCustomReminders)
  const [notes, setNotes] = useState<UserNote[]>(loadNotes)
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

  useEffect(() => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
    saveTheme(theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f8f3' : '#0d0d0d')
  }, [theme])

  useEffect(() => {
    document.title = ROUTE_META[route].title
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    pageRef.current?.focus({ preventScroll: true })
  }, [route])

  useEffect(() => {
    if (pendingReminderScroll && route === 'home') {
      document.getElementById('reminders-title')?.scrollIntoView({ block: 'start' })
      setPendingReminderScroll(false)
    }
  }, [pendingReminderScroll, route])

  const plan = useMemo(() => buildPlan(settings, done, skipped, progress), [settings, done, skipped, progress])

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
    const item = ITEMS.find((candidate) => candidate.id === id)
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
    if (route !== 'home') window.location.hash = ROUTE_META.home.hash
    setPendingReminderScroll(true)
  }

  const saveNote = (note: UserNote) =>
    setNotes((previous) => (previous.some((entry) => entry.id === note.id) ? previous.map((entry) => (entry.id === note.id ? note : entry)) : [note, ...previous]))

  const deleteNote = (id: string) => setNotes((previous) => previous.filter((entry) => entry.id !== id))

  const exportData = () => JSON.stringify({ v: 1, done, skipped, progress, settings, customReminders, dismissedReminders, notes })

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
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="container">
      <AppNav
        route={route}
        plan={plan}
        dueReminders={countDueReminders(reminders, dismissedReminders)}
        onBellClick={openReminders}
        theme={theme}
        onToggleTheme={() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))}
      />
      <ReminderBanner reminders={reminders} dismissed={dismissedReminders} onDismiss={toggleReminderDismiss} />
      <div className="page" ref={pageRef} tabIndex={-1}>
        {route === 'home' ? (
          <>
            <Hero plan={plan} />
            <main>
              <Recommendation plan={plan} settings={settings} done={done} skipped={skipped} onChange={setSettings} />
              <section className="page-section" aria-labelledby="tracks-title">
                <div className="page-section__header">
                  <h2 id="tracks-title">Треки</h2>
                  <p className="section-lead">Полные списки шагов с галочками — на страницах треков.</p>
                </div>
                <div className="track-cards">
                  {TRACKS.map((track) => (
                    <TrackCard key={track.id} trackPlan={plan.tracks[track.id]} done={done} skipped={skipped} settings={settings} />
                  ))}
                </div>
              </section>
              <ScheduleControls settings={settings} onChange={setSettings} onResetProgress={resetProgress} />
              <Timeline plan={plan} />
              <LoadChart plan={plan} settings={settings} />
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
                    <a href={ROUTE_META.skippedA.hash}>фриланс</a> · <a href={ROUTE_META.skippedB.hash}>fullstack</a>.
                  </p>
                </div>
              </section>
            </main>
          </>
        ) : route === 'notebook' ? (
          <Suspense fallback={<p className="page-loading">Загружаю заметки…</p>}>
            <NotebookPage notes={notes} onSave={saveNote} onDelete={deleteNote} />
          </Suspense>
        ) : route === 'skippedA' || route === 'skippedB' ? (
          <SkippedPage trackId={route === 'skippedA' ? 'A' : 'B'} />
        ) : (
          <TrackPage
            trackId={route}
            plan={plan}
            done={done}
            skipped={skipped}
            settings={settings}
            progress={progress}
            onToggle={toggleStep}
            onSkip={toggleSkip}
            onProgress={setStepProgress}
          />
        )}
      </div>
      {route !== 'home' && <OverallProgress plan={plan} />}
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
