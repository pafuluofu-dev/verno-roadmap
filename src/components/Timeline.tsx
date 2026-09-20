import { Fragment, useRef, type CSSProperties } from 'react'
import { useScrollFade } from './useScrollFade'
import { UNI_DATE, type Track } from '../data'
import { addDays, fmtDate, MONTHS_SHORT, parseISO, toISO, type Plan } from '../schedule'
import { trackLabel, trackModifier } from '../trackStyle'

interface TimelineProps {
  plan: Plan
  /** Все треки в порядке показа — встроенные и свои */
  tracks: Track[]
  /** Показать только один трек (страница трека) */
  only?: string
}

const MIN_SPAN_WEEKS = 8

export function Timeline({ plan, tracks, only }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const fade = useScrollFade(scrollRef)
  const viewportClass = ['timeline__viewport', fade.start ? 'timeline__viewport--fade-start' : '', fade.end ? 'timeline__viewport--fade-end' : '']
    .filter(Boolean)
    .join(' ')
  const shown = only ? tracks.filter((track) => track.id === only) : tracks
  const start = plan.start
  const minEnd = addDays(start, MIN_SPAN_WEEKS * 7)
  const end = plan.end > minEnd ? plan.end : minEnd
  const span = end.getTime() - start.getTime()
  const positionOf = (date: Date) => Math.min(100, Math.max(0, ((date.getTime() - start.getTime()) / span) * 100))

  const months: { label: string; x: number }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  while (cursor <= end) {
    months.push({ label: MONTHS_SHORT[cursor.getMonth()], x: positionOf(cursor) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const university = parseISO(UNI_DATE)
  const showUniversity = university > start && university <= end

  let counter = 0
  const milestones = shown.flatMap((track) =>
    plan.tracks[track.id].items
      .filter((step) => step.item.kind === 'milestone' && step.finish)
      .map((step) => ({ trackId: track.id, step, number: ++counter })),
  )

  return (
    <figure className="timeline">
      <figcaption className="timeline__caption">
        <h2>Календарь</h2>
        <p className="section-lead">
          Полосы — сколько длится каждый трек при текущем делении недели, заливка внутри показывает отмеченные часы; ромбы — вехи, когда появляется новая услуга
          или результат.
        </p>
      </figcaption>

      {/* График декоративен для скринридера — то же содержание словами */}
      <p className="visually-hidden">
        {shown
          .map((track) => {
            const trackPlan = plan.tracks[track.id]
            const percent = trackPlan.total ? Math.round((trackPlan.done / trackPlan.total) * 100) : 0
            return `${trackLabel(track)}: отмечено ${percent} %, финиш ${fmtDate(trackPlan.finish)}. `
          })
          .join('')}
        Возвращение в вуз 9 февраля 2027.
      </p>

      <div className={viewportClass}>
      <div className="timeline__scroll" ref={scrollRef}>
        <div className="timeline__chart" style={{ '--timeline-rows': shown.length } as CSSProperties} aria-hidden="true">
          <div className="timeline__months">
            {months.map((month) => (
              <span className="timeline__month" key={`${month.label}-${month.x}`} style={{ insetInlineStart: `${month.x}%` }}>
                {month.label}
              </span>
            ))}
            {showUniversity && (
              <span className="timeline__month timeline__month--university" style={{ insetInlineStart: `${positionOf(university)}%` }}>
                вуз · 9 фев
              </span>
            )}
          </div>

          {shown.map((track) => {
            const trackPlan = plan.tracks[track.id]
            const modifier = trackModifier(track.id)
            const percent = trackPlan.total ? Math.round((trackPlan.done / trackPlan.total) * 100) : 0
            return (
              <Fragment key={track.id}>
                <span className="timeline__row-label">{trackLabel(track)}</span>
                <div className="timeline__row">
                  <span className={`timeline__bar timeline__bar--${modifier}`} style={{ width: `${trackPlan.finish ? positionOf(trackPlan.finish) : 0}%` }}>
                    <span className={`timeline__fill timeline__fill--${modifier}`} style={{ width: `${percent}%` }} />
                  </span>
                  {milestones
                    .filter((milestone) => milestone.trackId === track.id)
                    .map((milestone) => (
                      <span className="timeline__milestone" key={milestone.step.item.id} style={{ insetInlineStart: `${positionOf(milestone.step.finish as Date)}%` }}>
                        <span className="timeline__milestone-marker" />
                        <span className="timeline__milestone-number">{milestone.number}</span>
                      </span>
                    ))}
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>
      </div>

      <ol className="milestone-legend">
        {milestones.map((milestone) => (
          <li className="milestone-legend__item" key={milestone.step.item.id}>
            <span className={`milestone-legend__number milestone-legend__number--${trackModifier(milestone.trackId)}`}>{milestone.number}</span>
            <span>{milestone.step.item.title}</span>
            <time className="milestone-legend__date" dateTime={toISO(milestone.step.finish as Date)}>{fmtDate(milestone.step.finish)}</time>
          </li>
        ))}
      </ol>
    </figure>
  )
}
