import { Fragment, useRef, type CSSProperties } from 'react'
import { useScrollFade } from './useScrollFade'
import { UNI_DATE, type TrackId } from '../data'
import { addDays, fmtDate, MONTHS_SHORT, parseISO, toISO, type Plan } from '../schedule'

interface TimelineProps {
  plan: Plan
  /** Показать только один трек (страница трека) */
  only?: TrackId
}

const MIN_SPAN_WEEKS = 8
const TRACK_IDS: TrackId[] = ['A', 'B']

export function Timeline({ plan, only }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const fade = useScrollFade(scrollRef)
  const viewportClass = ['timeline__viewport', fade.start ? 'timeline__viewport--fade-start' : '', fade.end ? 'timeline__viewport--fade-end' : '']
    .filter(Boolean)
    .join(' ')
  const trackIds: TrackId[] = only ? [only] : TRACK_IDS
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
  const milestones = trackIds.flatMap((trackId) =>
    plan.tracks[trackId].items
      .filter((step) => step.item.kind === 'milestone' && step.finish)
      .map((step) => ({ trackId, step, number: ++counter })),
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
        {trackIds
          .map((trackId) => {
            const track = plan.tracks[trackId]
            const percent = track.total ? Math.round((track.done / track.total) * 100) : 0
            return `Трек ${trackId}: отмечено ${percent} %, финиш ${fmtDate(track.finish)}. `
          })
          .join('')}
        Возвращение в вуз 9 февраля 2027.
      </p>

      <div className={viewportClass}>
      <div className="timeline__scroll" ref={scrollRef}>
        <div className="timeline__chart" style={{ '--timeline-rows': trackIds.length } as CSSProperties} aria-hidden="true">
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

          {trackIds.map((trackId) => {
            const track = plan.tracks[trackId]
            const modifier = trackId === 'A' ? 'track-a' : 'track-b'
            const percent = track.total ? Math.round((track.done / track.total) * 100) : 0
            return (
              <Fragment key={trackId}>
                <span className="timeline__row-label">Трек {trackId}</span>
                <div className="timeline__row">
                  <span className={`timeline__bar timeline__bar--${modifier}`} style={{ width: `${track.finish ? positionOf(track.finish) : 0}%` }}>
                    <span className={`timeline__fill timeline__fill--${modifier}`} style={{ width: `${percent}%` }} />
                  </span>
                  {milestones
                    .filter((milestone) => milestone.trackId === trackId)
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
            <span className={`milestone-legend__number milestone-legend__number--${milestone.trackId === 'A' ? 'track-a' : 'track-b'}`}>{milestone.number}</span>
            <span>{milestone.step.item.title}</span>
            <time className="milestone-legend__date" dateTime={toISO(milestone.step.finish as Date)}>{fmtDate(milestone.step.finish)}</time>
          </li>
        ))}
      </ol>
    </figure>
  )
}
