import {
  fmtDate,
  fmtHours,
  isDone,
  isScheduled,
  progressOf,
  toISO,
  unitsDone,
  unitsOf,
  type DoneMap,
  type ProgressMap,
  type Settings,
  type SkippedMap,
  type TrackPlan,
} from '../schedule'

interface NowPanelProps {
  trackPlan: TrackPlan
  done: DoneMap
  settings: Settings
  skipped: SkippedMap
  progress: ProgressMap
}

/** Родительный падеж после «из N»: 61 урока, но 129 уроков */
const UNIT_ONE: Record<string, string> = { уроков: 'урока', шагов: 'шага', задач: 'задачи' }

function unitLabel(total: number, word: string): string {
  const single = total % 10 === 1 && total % 100 !== 11
  return single ? UNIT_ONE[word] ?? word : word
}

/**
 * Первый незакрытый шаг в расписании — им и надо заниматься сегодня.
 * План отвечает «куда я иду»; эта панель отвечает «что делать прямо сейчас».
 */
export function NowPanel({ trackPlan, done, settings, skipped, progress }: NowPanelProps) {
  const queue = trackPlan.items.filter(
    (step) => step.item.kind !== 'milestone' && !isDone(step.item, done) && isScheduled(step.item, settings, skipped),
  )
  const current = queue[0]
  if (!current) return null

  const item = current.item
  const next = queue[1]
  const left = item.hours * (1 - progressOf(item, done, progress))
  const total = unitsOf(item)
  const passed = unitsDone(item, progress)
  const titleId = `now-${trackPlan.track.toLowerCase()}-title`

  return (
    <section className="now" aria-labelledby={titleId}>
      <p className="eyebrow">Сейчас</p>
      <h2 className="now__title" id={titleId}>
        {item.title}
      </h2>
      {item.meta && <p className="now__meta">{item.meta}</p>}
      <p className="now__facts">
        <span className="now__fact">
          осталось {fmtHours(left)} из {fmtHours(item.hours)} ч
        </span>
        {item.units && (
          <span className="now__fact">
            {passed} из {total} {unitLabel(total, item.unitWord ?? 'уроков')}
          </span>
        )}
        {current.finish && (
          <time className="now__fact" dateTime={toISO(current.finish)}>
            к {fmtDate(current.finish)}
          </time>
        )}
      </p>
      {item.url && (
        <p className="now__source">
          <a className="now__link" href={item.url} target="_blank" rel="noopener noreferrer">
            открыть материал
            <span aria-hidden="true"> ↗</span>
            <span className="visually-hidden"> (откроется в новой вкладке)</span>
          </a>
        </p>
      )}
      <p className="now__rule">Не начинай следующий шаг, пока этот не закрыт.</p>
      {next && (
        <p className="now__next">
          дальше — <strong className="now__next-title">{next.item.title}</strong>
        </p>
      )}
    </section>
  )
}
