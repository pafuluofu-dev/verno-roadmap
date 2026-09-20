import { TRACKS, type Item, type Track } from '../data'
import { shareOf, type DoneMap, type Plan, type ProgressMap, type Settings, type SkippedMap } from '../schedule'
import type { PlanEdits } from '../planEdits'
import { ROUTE_META, skippedRouteOf } from '../router'
import { LoadChart } from './LoadChart'
import { NowPanel } from './NowPanel'
import { Timeline } from './Timeline'
import { TrackSection } from './TrackSection'

interface TrackPageProps {
  track: Track
  /** Все треки — встроенные и свои: для доли недели и календаря */
  tracks: Track[]
  plan: Plan
  done: DoneMap
  skipped: SkippedMap
  settings: Settings
  progress: ProgressMap
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
  /** Правки этого трека, его исходные шаги и куда сохранять */
  edits: PlanEdits
  baseItems: Item[]
  onEdits: (edits: PlanEdits) => void
  /** Только у своих треков */
  onDeleteTrack?: () => void
}

export function TrackPage({ track, tracks, plan, done, skipped, settings, progress, onToggle, onSkip, onProgress, edits, baseItems, onEdits, onDeleteTrack }: TrackPageProps) {
  // «мимо плана» и ссылка на второй трек есть только у встроенных
  const builtinId = track.id === 'A' || track.id === 'B' ? track.id : null
  const otherId = builtinId === 'A' ? 'B' : 'A'
  const other = builtinId ? TRACKS.find((candidate) => candidate.id === otherId) : undefined
  const share = shareOf(track.id, settings, tracks)

  return (
    <main className="track-page">
      <p className="track-page__context">
        Этому треку — <strong>{share} % недели</strong> при {settings.hoursBefore} ч/нед (после 9 фев 2027 — {settings.hoursAfter} ч/нед). Кнопка «отложить» убирает шаг из
        расписания — даты сокращаются, «вернуть в план» возвращает. «Польза» у шага — оценка вклада в цель трека за потраченные часы: от 80 % брать обязательно, ниже
        50 % — кандидат на «отложить». <a href={ROUTE_META.home.hash}>Темп и стартовый трек — на обзоре</a>.
      </p>
      <TrackSection
        track={track}
        trackPlan={plan.tracks[track.id]}
        done={done}
        settings={settings}
        skipped={skipped}
        progress={progress}
        onToggle={onToggle}
        onSkip={onSkip}
        onProgress={onProgress}
        headingLevel={1}
        afterHeader={
          <>
            <NowPanel trackPlan={plan.tracks[track.id]} done={done} settings={settings} skipped={skipped} progress={progress} />
            <Timeline plan={plan} tracks={tracks} only={track.id} />
          </>
        }
        edits={edits}
        baseItems={baseItems}
        onEdits={onEdits}
      />
      <LoadChart plan={plan} settings={settings} tracks={tracks} only={track.id} />
      {builtinId && (
        <p className="track-page__other">
          Что из библиотеки не попало в этот трек и стоит ли возвращаться:{' '}
          <a href={ROUTE_META[skippedRouteOf(builtinId)].hash}>мимо плана — трек {builtinId}</a>
        </p>
      )}
      {other && (
        <p className="track-page__other">
          Второй трек: <a href={ROUTE_META[otherId].hash}>Трек {otherId} — {other.name}</a>
        </p>
      )}
      {onDeleteTrack && (
        <p className="track-page__other">
          <button type="button" className="link-button" onClick={onDeleteTrack}>
            Удалить трек
          </button>
        </p>
      )}
    </main>
  )
}
