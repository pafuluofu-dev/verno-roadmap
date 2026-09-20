import { fmtHours, type Plan } from '../schedule'
import { ROUTE_META } from '../router'
import { ProgressRing } from './ProgressRing'

interface OverallProgressProps {
  plan: Plan
}

/** Плавающее кольцо общего прогресса. Ведёт на обзор, поэтому на самом обзоре не рендерится */
export function OverallProgress({ plan }: OverallProgressProps) {
  const plans = Object.values(plan.tracks)
  const total = plans.reduce((sum, trackPlan) => sum + trackPlan.total, 0)
  const done = plans.reduce((sum, trackPlan) => sum + trackPlan.done, 0)
  const percent = total ? Math.round((done / total) * 100) : 0

  return (
    <a className="overall-progress" href={ROUTE_META.home.hash}>
      <ProgressRing
        percent={percent}
        color="var(--color-track-a)"
        label={`Общий прогресс ${percent} % — ${fmtHours(done)} из ${fmtHours(total)} ч по ${plans.length > 2 ? 'всем' : 'обоим'} трекам. Открыть обзор`}
        size={52}
      />
    </a>
  )
}
