import { SKIPPED, TRACKS, type Skipped, type TrackId } from '../data'
import { ROUTE_META } from '../router'

type Action = Skipped['action']

/** Порядок групп — от «ещё пригодится» к «закрыто»; последняя свёрнута по умолчанию */
const GROUPS: { action: Action; title: string; lead: string; open: boolean }[] = [
  { action: 'later', title: 'Вернуться после шага плана', lead: 'У каждого есть условие — какой шаг закрыть и что должно случиться, чтобы курс стал нужен.', open: true },
  { action: 'on-demand', title: 'Открыть под конкретный заказ', lead: 'Не проходить подряд. Держать под рукой как справочник и открывать нужный раздел, когда придёт заказ или вакансия.', open: true },
  { action: 'never', title: 'Не возвращаться', lead: 'Дубли, чужие профессии, чужой стек. Здесь, чтобы не тянуло «а вдруг».', open: false },
]

const ACTION_LABEL: Record<Action, string> = { later: 'позже', 'on-demand': 'под заказ', never: 'никогда' }

/** Цвет вероятности по порогам: до 20 — приглушённый, 20–50 — нейтральный, выше 50 — акцентный */
function valueBand(value: number): 'low' | 'mid' | 'high' {
  if (value < 20) return 'low'
  if (value <= 50) return 'mid'
  return 'high'
}

function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.endsWith('stepik.org')) return 'Курс на Stepik'
    if (host.endsWith('udemy.com')) return 'Курс на Udemy'
    return `Материал: ${host}`
  } catch {
    return 'Материал'
  }
}

function SkippedItem({ entry }: { entry: Skipped }) {
  const band = valueBand(entry.returnValue)
  return (
    <li className="skipped__item">
      <p className="skipped__title">
        {entry.title}
        <span className="skipped__meta"> · {entry.meta}</span>
      </p>
      <p className="skipped__badges">
        <span
          className={`skipped__value skipped__value--${band}`}
          role="img"
          aria-label={`Вероятность вернуться: ${entry.returnValue} из 100`}
        >
          {entry.returnValue} %
        </span>
        <span className={`skipped__badge skipped__badge--${entry.action}`}>{ACTION_LABEL[entry.action]}</span>
      </p>
      <p className="skipped__why">{entry.why}</p>
      <p className="skipped__trigger">
        <span className="skipped__trigger-label">когда вернуться</span> {entry.trigger}
      </p>
      {entry.url && (
        <p className="skipped__source">
          <a className="skipped__link" href={entry.url} target="_blank" rel="noopener noreferrer">
            {sourceLabel(entry.url)}
            <span aria-hidden="true"> ↗</span>
            <span className="visually-hidden"> (откроется в новой вкладке)</span>
          </a>
        </p>
      )}
    </li>
  )
}

export function SkippedPage({ trackId }: { trackId: TrackId }) {
  const track = TRACKS.find((candidate) => candidate.id === trackId)
  if (!track) return null

  const entries = SKIPPED.filter((entry) => entry.track === trackId)
  const modifier = trackId === 'A' ? 'skipped--a' : 'skipped--b'
  const otherId: TrackId = trackId === 'A' ? 'B' : 'A'
  const otherRoute = otherId === 'A' ? 'skippedA' : 'skippedB'

  return (
    <main className={`skipped ${modifier}`}>
      <header className="page-head">
        <p className="eyebrow">Трек {track.id} · мимо плана</p>
        <h1 className="skipped__heading">Что осталось за планом</h1>
        <p className="section-lead">
          Всё из библиотеки, что не стало шагом трека — {entries.length} курсов. У каждого — вероятность, что он реально понадобится за два года,
          и условие, при котором к нему стоит вернуться. Считается не «хороший ли курс», а приближает ли он к{' '}
          {trackId === 'A' ? 'заказам по стеку verno-dev.com' : 'офферу fullstack'}.
        </p>
      </header>

      {GROUPS.map((group) => {
        const items = entries.filter((entry) => entry.action === group.action).sort((a, b) => b.returnValue - a.returnValue)
        if (items.length === 0) return null
        const titleId = `skipped-${trackId.toLowerCase()}-${group.action}`
        return (
          <section className="skipped__group" aria-labelledby={titleId} key={group.action}>
            <details className="section-fold" open={group.open}>
              <summary className="section-fold__summary">
                <h2 className="skipped__group-title" id={titleId}>
                  {group.title}
                  <span className="skipped__group-count"> · {items.length}</span>
                </h2>
                <span className="section-fold__hint" aria-hidden="true" />
              </summary>
              <p className="section-lead section-fold__lead">{group.lead}</p>
              <ul className="skipped__list">
                {items.map((entry) => (
                  <SkippedItem entry={entry} key={entry.title} />
                ))}
              </ul>
            </details>
          </section>
        )
      })}

      <p className="skipped__other">
        <a href={ROUTE_META[trackId].hash}>← Трек {track.id}</a>
        <span aria-hidden="true"> · </span>
        <a href={ROUTE_META[otherRoute].hash}>Мимо плана в треке {otherId} →</a>
      </p>
    </main>
  )
}
