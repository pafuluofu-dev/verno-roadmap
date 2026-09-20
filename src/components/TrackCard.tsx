import type { Track } from '../data'
import { fmtDate, fmtDateYear, fmtHours, isDone, isScheduled, shareOf, type DoneMap, type Settings, type SkippedMap, type TrackPlan } from '../schedule'
import { trackHash } from '../router'
import { isBuiltinTrack, trackColor, trackLetter } from '../trackStyle'
import { ProgressRing } from './ProgressRing'

interface TrackCardProps {
  track: Track
  /** Все треки — для доли недели */
  tracks: Track[]
  trackPlan: TrackPlan
  done: DoneMap
  skipped: SkippedMap
  settings: Settings
}

export function TrackCard({ track, tracks, trackPlan, done, skipped, settings }: TrackCardProps) {
  const builtin = isBuiltinTrack(track.id)
  const modifier = builtin ? `track-card--${trackLetter(track.id)}` : 'track-card--custom'
  const percent = trackPlan.total ? Math.round((trackPlan.done / trackPlan.total) * 100) : 0
  const share = shareOf(track.id, settings, tracks)
  const hash = trackHash(track.id)
  const next = trackPlan.items.find(
    (step) => step.item.kind !== 'milestone' && !isDone(step.item, done) && isScheduled(step.item, settings, skipped),
  )

  return (
    <article className={`track-card ${modifier}`}>
      <div className="track-card__head">
        <div className="track-card__heading">
          <p className="eyebrow">{builtin ? `Трек ${track.id}` : 'Свой трек'} · {share} % недели</p>
          <h3 className="track-card__title">
            <a href={hash}>{track.name}</a>
          </h3>
          <p className="track-card__goal">{track.goal}</p>
        </div>
        <ProgressRing
          percent={percent}
          color={trackColor(track.id)}
          label={`Прогресс трека ${builtin ? track.id : `«${track.name}»`}: ${percent} %`}
        />
      </div>
      <p className="track-card__meta">
        <span>
          {fmtHours(trackPlan.done)} / {fmtHours(trackPlan.total)} ч · {percent} %
        </span>
        <span>финиш · {fmtDateYear(trackPlan.finish)}</span>
      </p>
      {next ? (
        <p className="track-card__next">
          <span className="track-card__next-label">следующий шаг</span>
          {next.item.title} · {fmtHours(next.item.hours)} ч{next.finish ? ` · к ${fmtDate(next.finish)}` : ''}
        </p>
      ) : (
        <p className="track-card__next">
          <span className="track-card__next-label">статус</span>
          Все шаги трека закрыты
        </p>
      )}
      <a className="button track-card__cta" href={hash}>
        {builtin ? `Открыть трек ${track.id}` : 'Открыть трек'}
      </a>
    </article>
  )
}
