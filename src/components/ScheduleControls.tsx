import type { CSSProperties } from 'react'
import type { Track } from '../data'
import { DEFAULT_SETTINGS, type Settings } from '../schedule'

interface ScheduleControlsProps {
  settings: Settings
  /** Все треки: со своими остаток недели уходит не B, а всем остальным */
  tracks: Track[]
  onChange: (settings: Settings) => void
  onResetProgress: () => void
}

function toBoundedNumber(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (value === '' || !Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function ScheduleControls({ settings, tracks, onChange, onResetProgress }: ScheduleControlsProps) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })
  const shareB = 100 - settings.shareA
  const custom = tracks.length > 2

  return (
    <section className="schedule-controls" aria-labelledby="controls-title">
      <h2 id="controls-title" className="schedule-controls__title">Настройки расписания</h2>

      <div className="schedule-controls__share">
        <div className="schedule-controls__share-header">
          <label className="schedule-controls__legend" htmlFor="share-range">Деление недели между треками</label>
          <output className="schedule-controls__output" htmlFor="share-range">
            <span className="schedule-controls__output-a">A {settings.shareA} %</span> ·{' '}
            <span className="schedule-controls__output-b">{custom ? 'остальным' : 'B'} {shareB} %</span>
          </output>
        </div>
        <input
          id="share-range"
          className="schedule-controls__range"
          type="range"
          min={0}
          max={100}
          step={5}
          value={settings.shareA}
          style={{ '--share-a': `${settings.shareA}%` } as CSSProperties}
          onChange={(event) => update({ shareA: Number(event.target.value) })}
        />
      </div>

      <fieldset className="schedule-controls__fields">
        <legend className="visually-hidden">Темп и старт</legend>
        <p className="schedule-controls__field">
          <label className="schedule-controls__label" htmlFor="start-date">Старт</label>
          <input
            id="start-date"
            className="schedule-controls__input"
            type="date"
            value={settings.start}
            onChange={(event) => event.target.value && update({ start: event.target.value })}
          />
        </p>
        <p className="schedule-controls__field">
          <label className="schedule-controls__label" htmlFor="hours-before">ч/нед до 9 фев 2027</label>
          <input
            id="hours-before"
            className="schedule-controls__input"
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            value={settings.hoursBefore}
            onChange={(event) => update({ hoursBefore: toBoundedNumber(event.target.value, 1, 80, DEFAULT_SETTINGS.hoursBefore) })}
          />
        </p>
        <p className="schedule-controls__field">
          <label className="schedule-controls__label" htmlFor="hours-after">ч/нед после вуза</label>
          <input
            id="hours-after"
            className="schedule-controls__input"
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            value={settings.hoursAfter}
            onChange={(event) => update({ hoursAfter: toBoundedNumber(event.target.value, 1, 80, DEFAULT_SETTINGS.hoursAfter) })}
          />
        </p>
        <label className="schedule-controls__toggle">
          <input
            className="schedule-controls__checkbox"
            type="checkbox"
            checked={settings.includeOptional}
            onChange={(event) => update({ includeOptional: event.target.checked })}
          />
          Ставить в расписание шаги «по желанию»
        </label>
        <div className="schedule-controls__actions">
          <button type="button" className="button" onClick={() => onChange({ ...DEFAULT_SETTINGS, start: settings.start })}>
            Настройки по умолчанию
          </button>
          <button type="button" className="button" onClick={onResetProgress}>
            Снять галочки
          </button>
        </div>
      </fieldset>

      <p className="schedule-controls__hint">
        {custom ? 'Когда один трек закончен, его часы делятся между остальными.' : 'Когда один трек закончен, вся неделя уходит второму.'} Заказ важнее курса: если
        заказы съедают время, просто уменьши часы в неделю — даты сдвинутся честно.
      </p>
    </section>
  )
}
