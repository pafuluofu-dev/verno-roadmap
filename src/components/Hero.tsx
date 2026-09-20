import type { Track } from '../data'
import { fmtDateYear, fmtHours, type Plan } from '../schedule'
import { isBuiltinTrack } from '../trackStyle'
import { AnimatedNumber } from './AnimatedNumber'

interface HeroProps {
  plan: Plan
  tracks: Track[]
}

export function Hero({ plan, tracks }: HeroProps) {
  const plans = tracks.map((track) => plan.tracks[track.id])
  const total = plans.reduce((sum, trackPlan) => sum + trackPlan.total, 0)
  const done = plans.reduce((sum, trackPlan) => sum + trackPlan.done, 0)
  const percent = total ? Math.round((done / total) * 100) : 0

  const stats = [
    ...tracks.map((track, index) => ({
      value: plans[index].remaining,
      format: fmtHours,
      unit: 'ч',
      label: `осталось в треке ${isBuiltinTrack(track.id) ? track.id : track.name} · финиш ${fmtDateYear(plans[index].finish)}`,
    })),
    { value: plan.weeks, format: undefined, unit: 'нед', label: `до закрытия ${tracks.length > 2 ? 'всех' : 'обоих'} треков при текущих настройках` },
    { value: percent, format: undefined, unit: '%', label: `отмечено · ${fmtHours(done)} из ${fmtHours(total)} ч` },
  ]

  return (
    <header className="hero">
      <p className="eyebrow">Учебный план · два трека · verno-dev.com</p>
      <h1>Маршрут verno/dev</h1>
      <p className="hero__lead">
        Два независимых трека: <strong>A — фриланс как можно быстрее</strong> (всё, что продаётся по стеку сайта) и{' '}
        <strong>B — рост как программиста</strong> (fullstack-путь из чек-листов Google AI и DeepSeek). Здесь, на обзоре, —
        рекомендация с чего начать, настройки темпа и календарь; списки курсов с галочками — на страницах треков.
      </p>
      <ul className="hero__stats">
        {stats.map((stat) => (
          <li className="stat-card" key={stat.label}>
            <p className="stat-card__value">
              <AnimatedNumber value={stat.value} format={stat.format} />
              <span className="stat-card__unit">{stat.unit}</span>
            </p>
            <p className="stat-card__label">{stat.label}</p>
          </li>
        ))}
      </ul>
      <span className="progress-bar" role="progressbar" aria-label="Отмечено часов" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </span>
    </header>
  )
}
