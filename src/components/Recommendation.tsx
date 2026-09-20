import { useMemo } from 'react'
import type { Item, Track } from '../data'
import { buildPlan, fmtDate, isDone, type DoneMap, type Plan, type Settings, type SkippedMap } from '../schedule'
import { ROUTE_META } from '../router'
import { trackShortLabel } from '../trackStyle'

interface RecommendationProps {
  plan: Plan
  settings: Settings
  done: DoneMap
  skipped: SkippedMap
  /** Итоговые шаги и все треки — варианты старта считаются по ним же, что и основной план */
  items: Item[]
  tracks: Track[]
  onChange: (settings: Settings) => void
}

const START_OPTIONS = [
  { shareA: 70, label: 'Сначала фриланс', hint: 'A 70 % · B 30 %', recommended: true },
  { shareA: 50, label: 'Поровну', hint: 'A 50 % · B 50 %', recommended: false },
  { shareA: 30, label: 'Сначала рост', hint: 'A 30 % · B 70 %', recommended: false },
]

export function Recommendation({ plan, settings, done, skipped, items, tracks, onChange }: RecommendationProps) {
  const firstMilestoneA = plan.tracks.A.items.find((step) => step.item.kind === 'milestone' && !isDone(step.item, done) && step.finish)
  const apiMilestoneB = plan.tracks.B.items.find((step) => step.item.id === 'm-b-api')
  // со своими треками остаток недели делится не между A и B, а между всеми остальными
  const custom = tracks.length > 2

  const variants = useMemo(
    () => START_OPTIONS.map((option) => ({ option, variant: buildPlan({ ...settings, shareA: option.shareA }, done, skipped, {}, items, tracks) })),
    [settings, done, skipped, items, tracks],
  )

  return (
    <section className="recommendation" aria-labelledby="recommendation-title">
      <p className="eyebrow">С чего начать</p>
      <h2 id="recommendation-title">Начинай с трека A, трек B веди фоном</h2>
      <details className="recommendation__why">
        <summary className="section-fold__summary">
          <span className="recommendation__why-title">Почему так — четыре причины</span>
          <span className="section-fold__hint" aria-hidden="true" />
        </summary>
        <ul className="recommendation__reasons">
        <li>
          <strong>Трек A платит сразу.</strong> Tilda уже пройдена — лендинги можно продавать с первого дня, а ближайшая веха
          {firstMilestoneA ? ` «${firstMilestoneA.item.title.replace('В прайсе: ', '')}» расширит прайс уже к ${fmtDate(firstMilestoneA.finish)}` : ' уже закрыта'}.
        </li>
        <li>
          <strong>Трек B платит потом.</strong> До вехи «Свой API + React-фронт»{apiMilestoneB?.finish ? ` (≈ ${fmtDate(apiMilestoneB.finish)})` : ''} он не добавляет услуг в
          прайс — это марафон, 30 % недели ему достаточно.
        </li>
        <li>
          <strong>Но не откладывай B на потом.</strong> JS и Node из трека B усиливают и заказы трека A: интеграции, боты, личные кабинеты. Поэтому фоном, а не «после».
        </li>
          <li>
            <strong>Раз в неделю сверяйся с парсером заказов.</strong> Если реальный спрос выглядит иначе — поменяй стартовый трек или сдвинь ползунок в настройках, все даты
            пересчитаются.
          </li>
        </ul>
      </details>

      <fieldset className="recommendation__start">
        <legend className="recommendation__legend">Выбери стартовый трек — даты финиша пересчитаются во всём плане</legend>
        <div className="recommendation__options">
          {variants.map(({ option, variant }) => {
            const isActive = settings.shareA === option.shareA
            return (
              <button
                key={option.shareA}
                type="button"
                className={`start-option${isActive ? ' start-option--active' : ''}`}
                aria-pressed={isActive}
                onClick={() => onChange({ ...settings, shareA: option.shareA })}
              >
                <span className="start-option__label">
                  {option.label}
                  {option.recommended && <span className="badge badge--recommended">рекомендую</span>}
                </span>
                <span className="start-option__hint">{custom ? `A ${option.shareA} % · остальным ${100 - option.shareA} %` : option.hint}</span>
                <span className="start-option__dates">
                  {tracks.map((track) => `${trackShortLabel(track)} → ${fmtDate(variant.tracks[track.id].finish)}`).join(' · ')}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="recommendation__actions">
        <a className="button button--primary" href={ROUTE_META.A.hash}>
          Открыть трек A
        </a>
        <p className="recommendation__hint">
          План кажется огромным? У каждого шага на странице трека есть «отложить» — шаг уходит из расписания, даты сокращаются, вернуть можно в один клик.
        </p>
      </div>
    </section>
  )
}
