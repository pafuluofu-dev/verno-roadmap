import { TRACKS, type TrackId } from '../data'
import type { DoneMap, Plan, ProgressMap, Settings, SkippedMap } from '../schedule'
import { ROUTE_META, skippedRouteOf } from '../router'
import { LoadChart } from './LoadChart'
import { Timeline } from './Timeline'
import { TrackSection } from './TrackSection'

interface TrackPageProps {
  trackId: TrackId
  plan: Plan
  done: DoneMap
  skipped: SkippedMap
  settings: Settings
  progress: ProgressMap
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
}

export function TrackPage({ trackId, plan, done, skipped, settings, progress, onToggle, onSkip, onProgress }: TrackPageProps) {
  const otherId: TrackId = trackId === 'A' ? 'B' : 'A'
  const other = TRACKS.find((candidate) => candidate.id === otherId)
  const share = trackId === 'A' ? settings.shareA : 100 - settings.shareA

  return (
    <main className="track-page">
      <p className="track-page__context">
        Этому треку — <strong>{share} % недели</strong> при {settings.hoursBefore} ч/нед (после 9 фев 2027 — {settings.hoursAfter} ч/нед). Кнопка «отложить» убирает шаг из
        расписания — даты сокращаются, «вернуть в план» возвращает. «Польза» у шага — оценка вклада в цель трека за потраченные часы: от 80 % брать обязательно, ниже
        50 % — кандидат на «отложить». <a href={ROUTE_META.home.hash}>Темп и стартовый трек — на обзоре</a>.
      </p>
      <TrackSection
        trackPlan={plan.tracks[trackId]}
        done={done}
        settings={settings}
        skipped={skipped}
        progress={progress}
        onToggle={onToggle}
        onSkip={onSkip}
        onProgress={onProgress}
        headingLevel={1}
        afterHeader={<Timeline plan={plan} only={trackId} />}
      />
      <LoadChart plan={plan} settings={settings} only={trackId} />
      <p className="track-page__other">
        Что из библиотеки не попало в этот трек и стоит ли возвращаться:{' '}
        <a href={ROUTE_META[skippedRouteOf(trackId)].hash}>мимо плана — трек {trackId}</a>
      </p>
      {other && (
        <p className="track-page__other">
          Второй трек: <a href={ROUTE_META[otherId].hash}>Трек {otherId} — {other.name}</a>
        </p>
      )}
    </main>
  )
}
