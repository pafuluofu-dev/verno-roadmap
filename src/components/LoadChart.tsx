import { useEffect, useState } from 'react'
import { UNI_DATE, type Track } from '../data'
import { fmtDate, MONTHS_SHORT, parseISO, type Plan, type Settings, type WeekLoad } from '../schedule'
import { isBuiltinTrack, shortName, trackLetter, trackShortLabel } from '../trackStyle'

interface LoadChartProps {
  plan: Plan
  settings: Settings
  /** Все треки в порядке показа — встроенные и свои */
  tracks: Track[]
  /** Показать только один трек (страница трека) */
  only?: string
}

/** Стековая диаграмма: сколько часов в неделю получает каждый трек */
export function LoadChart({ plan, settings, tracks, only }: LoadChartProps) {
  let weeks = plan.load
  if (only) {
    let lastIndex = -1
    weeks.forEach((week, index) => {
      if (week.hours[only] > 0.001) lastIndex = index
    })
    weeks = weeks.slice(0, lastIndex + 1)
  }
  const shown = only ? tracks.filter((track) => track.id === only) : tracks
  const [grown, setGrown] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (weeks.length === 0) return null

  const hoursOf = (week: WeekLoad) => (only ? week.hours[only] ?? 0 : tracks.reduce((sum, track) => sum + (week.hours[track.id] ?? 0), 0))
  const max = only
    ? Math.max(1, ...weeks.map(hoursOf))
    : Math.max(settings.hoursBefore, settings.hoursAfter, ...weeks.map(hoursOf))
  const uni = parseISO(UNI_DATE)
  const uniIndex = weeks.findIndex((week) => week.start >= uni)
  const detail = (week: WeekLoad) =>
    only
      ? `неделя с ${fmtDate(week.start)} · ${Math.round(week.hours[only] ?? 0)} ч`
      : `неделя с ${fmtDate(week.start)} · ${tracks.map((track) => `${trackShortLabel(track)} ${Math.round(week.hours[track.id] ?? 0)} ч`).join(' · ')}`

  return (
    <section className="page-section" aria-labelledby="load-title">
      <div className="page-section__header">
        <h2 id="load-title">Нагрузка по неделям</h2>
        <p className="section-lead">
          {only
            ? 'Сколько часов получает этот трек каждую неделю при текущих настройках. Наведи на столбик — точные числа.'
            : `Сколько часов получает каждый трек при текущих настройках. Наведи на столбик — точные числа; пунктир — возвращение в вуз, темп падает до ${settings.hoursAfter} ч/нед.`}
        </p>
      </div>
      <div className="load-chart">
        <div className="load-chart__bars" role="img" aria-label={`Диаграмма нагрузки: ${weeks.length} недель, до ${Math.round(max)} часов в неделю`}>
          {weeks.map((week, index) => {
            const delay = `${Math.min(index * 20, 600)}ms`
            const title = detail(week)
            const isSelected = selected === index
            return (
              <button
                key={week.start.getTime()}
                type="button"
                className={`load-chart__week${index === uniIndex ? ' load-chart__week--uni' : ''}${isSelected ? ' load-chart__week--selected' : ''}`}
                title={title}
                aria-label={title}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : index)}
              >
                {/* Столбик растёт снизу: первый трек — в основании, поэтому порядок обратный */}
                {[...shown].reverse().map((track) => (
                  <span
                    key={track.id}
                    className={`load-chart__seg load-chart__seg--${trackLetter(track.id)}`}
                    style={{ height: grown ? `${((week.hours[track.id] ?? 0) / max) * 100}%` : '0%', transitionDelay: delay }}
                  />
                ))}
              </button>
            )
          })}
        </div>
        <div className="load-chart__months" aria-hidden="true">
          {weeks.map((week, index) => {
            const previous = weeks[index - 1]
            const showMonth = index === 0 || (previous && previous.start.getMonth() !== week.start.getMonth())
            return (
              <span key={week.start.getTime()} className="load-chart__month">
                {showMonth ? MONTHS_SHORT[week.start.getMonth()] : ''}
              </span>
            )
          })}
        </div>
        <p className="load-chart__detail" role="status">
          {selected !== null && weeks[selected] ? detail(weeks[selected]) : 'Тапни или кликни столбик — здесь появятся точные часы недели.'}
        </p>
        <p className="load-chart__legend">
          {shown.map((track) => (
            <span key={track.id} className={`load-chart__key load-chart__key--${trackLetter(track.id)}`}>
              {isBuiltinTrack(track.id) ? `трек ${track.id}` : shortName(track.name)}
            </span>
          ))}
          {uniIndex >= 0 && <span className="load-chart__key">⌇ пунктир — вуз, 9 фев</span>}
        </p>
      </div>
    </section>
  )
}
