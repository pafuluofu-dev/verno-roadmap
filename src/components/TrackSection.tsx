import type { ReactNode } from 'react'
import { HABITS, TRACKS, type Item, type TrackId } from '../data'
import {
  fmtDate,
  fmtDateYear,
  fmtHours,
  isDone,
  isScheduled,
  progressOf,
  toISO,
  unitsDone,
  unitsOf,
  type DoneMap,
  type ItemPlan,
  type ProgressMap,
  type Settings,
  type SkippedMap,
  type TrackPlan,
} from '../schedule'
import { AnimatedNumber } from './AnimatedNumber'
import { PauseIcon } from './icons'
import { ProgressRing } from './ProgressRing'

interface TrackSectionProps {
  trackPlan: TrackPlan
  done: DoneMap
  settings: Settings
  skipped: SkippedMap
  progress: ProgressMap
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
  /** 1 — на странице трека (заголовок страницы), 2 — в общем списке */
  headingLevel?: 1 | 2
  /** Контент между шапкой трека и списком шагов (календарь на странице трека) */
  afterHeader?: ReactNode
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

export function TrackSection({
  trackPlan,
  done,
  settings,
  skipped,
  progress,
  onToggle,
  onSkip,
  onProgress,
  headingLevel = 2,
  afterHeader,
}: TrackSectionProps) {
  const track = TRACKS.find((candidate) => candidate.id === trackPlan.track)
  if (!track) return null

  const Heading: 'h1' | 'h2' = headingLevel === 1 ? 'h1' : 'h2'
  const modifier = track.id === 'A' ? 'track--a' : 'track--b'
  const percent = trackPlan.total ? Math.round((trackPlan.done / trackPlan.total) * 100) : 0
  const habits = HABITS.filter((habit) => habit.track === track.id)
  const titleId = `track-${track.id.toLowerCase()}-title`
  const skippedSteps = trackPlan.items.filter((step) => step.item.kind !== 'milestone' && skipped[step.item.id] && !isDone(step.item, done))
  const skippedHours = skippedSteps.reduce((sum, step) => sum + step.item.hours, 0)

  return (
    <section className={`track ${modifier}`} aria-labelledby={titleId}>
      <header className="track__header">
        <div className="track__header-main">
          <p className="eyebrow">Трек {track.id}</p>
          <Heading id={titleId} className="track__title">{track.name}</Heading>
          <p className="track__goal">{track.goal}</p>
          <p className="track__meta">
            <span>
              <AnimatedNumber value={trackPlan.done} format={fmtHours} /> / {fmtHours(trackPlan.total)} ч · {percent} %
            </span>
            {skippedSteps.length > 0 && (
              <span>
                отложено · {skippedSteps.length} ш. · {fmtHours(skippedHours)} ч
              </span>
            )}
            <span>финиш · {fmtDateYear(trackPlan.finish)}</span>
          </p>
        </div>
        <ProgressRing
          percent={percent}
          color={track.id === 'A' ? 'var(--color-track-a)' : 'var(--color-track-b)'}
          label={`Прогресс трека ${track.id}: ${percent} %`}
          size={72}
        />
      </header>

      {afterHeader}

      <div className="stages">
        {buildStages(trackPlan.items).map((stage) => (
          <StageCard
            key={stage.n}
            stage={stage}
            trackId={track.id}
            done={done}
            settings={settings}
            skipped={skipped}
            progress={progress}
            onToggle={onToggle}
            onSkip={onSkip}
            onProgress={onProgress}
          />
        ))}
      </div>

      <div className="habits">
        <p className="eyebrow">Привычки трека — не в часах, а каждый день</p>
        <ul className="habit-list">
          {habits.map((habit) => (
            <li className="habit-list__item" key={habit.text}>
              <span className="habit-list__time">{habit.time}</span>
              <span>{habit.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Этап — отрезок трека до ближайшей вехи; веха закрывает этап и служит его целью */
interface Stage {
  n: number
  goal: ItemPlan | null
  steps: ItemPlan[]
}

function buildStages(items: ItemPlan[]): Stage[] {
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

interface StageCardProps {
  stage: Stage
  trackId: TrackId
  done: DoneMap
  settings: Settings
  skipped: SkippedMap
  progress: ProgressMap
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
}

function StageCard({ stage, trackId, done, settings, skipped, progress, onToggle, onSkip, onProgress }: StageCardProps) {
  // В знаменателе только шаги «в игре»: отложенные из счёта уходят, как и из расписания
  const counted = stage.steps.filter((step) => isDone(step.item, done) || isScheduled(step.item, settings, skipped))
  const doneSteps = counted.filter((step) => isDone(step.item, done))
  const totalHours = counted.reduce((sum, step) => sum + step.item.hours, 0)
  // частично пройденные курсы идут в счёт этапа своей долей, а не нулём
  const doneHours = counted.reduce((sum, step) => sum + step.item.hours * progressOf(step.item, done, progress), 0)
  const percent = totalHours ? Math.round((doneHours / totalHours) * 100) : 0
  const allDone = counted.length > 0 && doneSteps.length === counted.length
  // Шаги «по желанию» и отложенные остаются в списке, но не в счёте — иначе цифры не сходятся с видимыми строками
  const parked = stage.steps.length - counted.length
  const goalDone = stage.goal ? isDone(stage.goal.item, done) || allDone : false

  return (
    <details className="stage" open={!allDone}>
      <summary className="stage__summary">
        <span className="stage__name">
          Этап {stage.n}
          {stage.goal && <span className="stage__goal"> · {stage.goal.item.title}</span>}
          {!stage.goal && <span className="stage__goal"> · дальше, без отдельной вехи</span>}
        </span>
        <span className="stage__count">
          {doneSteps.length}/{counted.length} · {fmtHours(doneHours)} из {fmtHours(totalHours)} ч
          {parked > 0 && <span className="stage__parked"> · {parked} вне расписания</span>}
        </span>
      </summary>

      <span
        className="progress-bar stage__bar"
        role="progressbar"
        aria-label={`Прогресс этапа ${stage.n}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={`progress-bar__fill progress-bar__fill--${trackId === 'A' ? 'track-a' : 'track-b'}`} style={{ width: `${percent}%` }} />
      </span>

      {stage.goal && (
        <p className="stage__goal-note">
          {goalDone ? (
            <span className="stage__goal-date">открыто</span>
          ) : stage.goal.finish ? (
            <time className="stage__goal-date" dateTime={toISO(stage.goal.finish)}>
              ≈ {fmtDate(stage.goal.finish)}
            </time>
          ) : (
            <span className="stage__goal-date">—</span>
          )}
          {stage.goal.item.note}
        </p>
      )}

      <ol className="stage__steps">
        {stage.steps.map((step) => (
          <StepItem
            key={step.item.id}
            step={step}
            checked={isDone(step.item, done)}
            scheduled={isScheduled(step.item, settings, skipped)}
            isSkipped={!!skipped[step.item.id]}
            unitsCompleted={unitsDone(step.item, progress)}
            onToggle={onToggle}
            onSkip={onSkip}
            onProgress={onProgress}
          />
        ))}
      </ol>
    </details>
  )
}

interface StepItemProps {
  step: ItemPlan
  checked: boolean
  scheduled: boolean
  isSkipped: boolean
  unitsCompleted: number
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
}

/** Подпись ссылки по домену: пользователь должен понимать, куда уйдёт, ещё до клика */
function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.endsWith('udemy.com')) return 'Курс на Udemy'
    if (host.endsWith('stepik.org')) return 'Курс на Stepik'
    if (host.endsWith('youtube.com') || host === 'youtu.be') return 'Плейлист на YouTube'
    return `Материал: ${host}`
  } catch {
    return 'Материал'
  }
}

function StepSource({ url }: { url?: string }) {
  if (!url) return null
  return (
    <p className="step__source">
      <a className="step__source-link" href={url} target="_blank" rel="noopener noreferrer">
        {sourceLabel(url)}
        <span aria-hidden="true"> ↗</span>
        <span className="visually-hidden"> (откроется в новой вкладке)</span>
      </a>
    </p>
  )
}

/**
 * Ручной счётчик пройденного по шагу. Считаем в уроках, если их число известно,
 * иначе в процентах — так полоса появляется у каждого шага, а не только у курсов с разбивкой.
 */
function StepProgress({ item, value, onProgress }: { item: Item; value: number; onProgress: (id: string, value: number) => void }) {
  const total = unitsOf(item)
  const percent = total ? Math.round((value / total) * 100) : 0
  const inputId = `${item.id}-progress`

  return (
    <div className="step__progress">
      <span
        className="progress-bar step__progress-bar"
        role="progressbar"
        aria-label={`Пройдено по шагу «${item.title}»`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={item.units ? `${value} из ${total} ${item.unitWord ?? 'уроков'}` : `${percent} %`}
      >
        <span className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </span>
      <p className="step__progress-row">
        <label className="step__progress-label" htmlFor={inputId}>
          пройдено
        </label>
        <input
          className="step__progress-input"
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          max={total}
          step={1}
          value={value}
          onChange={(event) => onProgress(item.id, Number(event.target.value))}
        />
        <span className="step__progress-total">{item.units ? `из ${total} ${item.unitWord ?? 'уроков'} · ${percent} %` : '%'}</span>
        {value > 0 && (
          <button type="button" className="link-button step__progress-reset" onClick={() => onProgress(item.id, 0)}>
            сбросить
          </button>
        )}
      </p>
    </div>
  )
}

function StepItem({ step, checked, scheduled, isSkipped, unitsCompleted, onToggle, onSkip, onProgress }: StepItemProps) {
  const item: Item = step.item
  const locked = Boolean(item.done)

  if (isSkipped && !checked) {
    return (
      <li className="step step--skipped">
        <span className="step__pause" aria-hidden="true">
          <PauseIcon />
        </span>
        <p className="step__title step__title--plain">
          {item.title}
          {item.meta && <span className="step__meta"> · {item.meta}</span>}
          <span className="badge badge--skipped">отложено</span>
        </p>
        <StepSource url={item.url} />
        <p className="step__hours">
          <span className="step__hours-value">{fmtHours(item.hours)} ч</span>
          <button type="button" className="link-button step__defer" onClick={() => onSkip(item.id)}>
            вернуть в план
          </button>
        </p>
      </li>
    )
  }

  const parked = !scheduled && !checked
  const noteId = `${item.id}-note`
  const className = ['step', checked ? 'step--done' : '', parked ? 'step--parked' : ''].filter(Boolean).join(' ')

  return (
    <li className={className}>
      <input
        className="step__checkbox"
        type="checkbox"
        id={item.id}
        checked={checked}
        disabled={locked}
        aria-describedby={noteId}
        onChange={() => onToggle(item.id)}
      />
      <label className="step__title" htmlFor={item.id}>
        {item.title}
        {item.meta && <span className="step__meta"> · {item.meta}</span>}
        {item.kind === 'free' && <span className="badge badge--free">бесплатно</span>}
        {item.kind === 'practice' && <span className="badge badge--practice">практика</span>}
        {item.optional && <span className="badge badge--optional">по желанию</span>}
      </label>
      <StepSource url={item.url} />
      <details className="step__details">
        <summary className="step__details-summary">что именно проходить</summary>
        <p className="step__note" id={noteId}>{item.note}</p>
      </details>
      {!locked && !checked && <StepProgress item={item} value={unitsCompleted} onProgress={onProgress} />}
      <p className="step__hours">
        <span className="step__hours-value">{locked ? 'готово' : checked ? 'отмечено' : `${fmtHours(item.hours)} ч`}</span>
        {!locked && !checked && (
          <>
            {item.video ? `${formatNumber(item.video)} ч видео${item.factor ? ` · ×${formatNumber(item.factor)}` : ''}` : 'вне Udemy'}
            <br />
            {parked ? 'не в расписании' : step.finish ? `к ${fmtDate(step.finish)}` : ''}
          </>
        )}
        {!locked && !checked && !parked && (
          <button type="button" className="link-button step__defer" onClick={() => onSkip(item.id)}>
            отложить
          </button>
        )}
      </p>
    </li>
  )
}
