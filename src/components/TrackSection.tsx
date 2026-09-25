import { useState, type ReactNode } from 'react'
import { HABITS, type Item, type Track } from '../data'
import {
  fmtDate,
  fmtDateYear,
  fmtHours,
  isDone,
  isScheduled,
  progressOf,
  toISO,
  unitsDone,
  unitsOf,
  type DoneMap,
  type ItemPlan,
  type ProgressMap,
  type Settings,
  type SkippedMap,
  type TrackPlan,
} from '../schedule'
import {
  addFolder,
  addNode,
  deleteFolder,
  deleteNode,
  diffFolderFields,
  diffNodeFields,
  hasEdits,
  moveFolder,
  moveNode,
  moveNodeToFolder,
  resetEdits,
  swapNodes,
  TAIL_ID,
  updateFolder,
  updateNode,
  type FolderFields,
  type NodeFields,
  type PlanEdits,
} from '../planEdits'
import { buildStages, type Stage } from '../tree'
import { isBuiltinTrack, trackColor, trackLetter, trackModifier } from '../trackStyle'
import { AnimatedNumber } from './AnimatedNumber'
import { PauseIcon } from './icons'
import { FolderForm, MILESTONE_LABELS, NEW_STAGE_LABELS, NodeForm, PlanEditorPanel, plural, StageTools, StepTools, type FolderOption } from './PlanEditor'
import { ProgressRing } from './ProgressRing'

interface TrackSectionProps {
  track: Track
  trackPlan: TrackPlan
  done: DoneMap
  settings: Settings
  skipped: SkippedMap
  progress: ProgressMap
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
  /** 1 — на странице трека (заголовок страницы), 2 — в общем списке */
  headingLevel?: 1 | 2
  /** Контент между шапкой трека и списком шагов (календарь на странице трека) */
  afterHeader?: ReactNode
  /** Редактор этапов и шагов: правки трека, его исходные шаги и куда сохранять */
  edits: PlanEdits
  baseItems: Item[]
  onEdits: (edits: PlanEdits) => void
}

/** Раскрытая форма редактора: правка шага или вехи, новый шаг в этап, новый этап */
type EditorForm = { kind: 'node'; id: string } | { kind: 'new-node'; folderId: string } | { kind: 'folder'; id: string } | { kind: 'new-folder' }

/** Состояние и колбэки редактора, которые нужны карточке этапа; есть только в режиме редактирования */
interface StageEditor {
  form: EditorForm | null
  swapFirst: string | null
  folders: FolderOption[]
  onMoveFolder: (id: string, delta: number) => void
  onDeleteFolder: (id: string) => void
  onEditFolder: (id: string) => void
  onSaveFolder: (id: string, fields: FolderFields) => void
  onAddNode: (folderId: string) => void
  onMoveNode: (id: string, delta: number) => void
  onSwapNode: (id: string) => void
  onEditNode: (id: string) => void
  onDeleteNode: (id: string) => void
  /** id null — новый шаг в конец folderId */
  onSaveNode: (id: string | null, folderId: string, fields: NodeFields) => void
  onCancel: () => void
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

/** Поля формы из шага; веха сюда не попадает — у неё своя форма */
function nodeFieldsOf(item: Item): NodeFields {
  const { kind, title, meta, note, hours, video, factor, optional, url, units, unitWord, value } = item
  return { kind: kind === 'milestone' ? 'course' : kind, title, meta, note, hours, video, factor, optional, url, units, unitWord, value }
}

export function TrackSection({
  track,
  trackPlan,
  done,
  settings,
  skipped,
  progress,
  onToggle,
  onSkip,
  onProgress,
  headingLevel = 2,
  afterHeader,
  edits,
  baseItems,
  onEdits,
}: TrackSectionProps) {
  // Пустой свой трек открывается сразу в режиме редактирования — иначе на странице нечего делать
  const [editing, setEditing] = useState(() => trackPlan.items.length === 0)
  const [form, setForm] = useState<EditorForm | null>(null)
  const [swapFirst, setSwapFirst] = useState<string | null>(null)

  const Heading: 'h1' | 'h2' = headingLevel === 1 ? 'h1' : 'h2'
  const builtin = isBuiltinTrack(track.id)
  const modifier = `track--${trackLetter(track.id)}`
  const percent = trackPlan.total ? Math.round((trackPlan.done / trackPlan.total) * 100) : 0
  const habits = HABITS.filter((habit) => habit.track === track.id)
  const titleId = `track-${track.id.toLowerCase()}-title`
  const skippedSteps = trackPlan.items.filter((step) => step.item.kind !== 'milestone' && skipped[step.item.id] && !isDone(step.item, done))
  const skippedHours = skippedSteps.reduce((sum, step) => sum + step.item.hours, 0)

  const stages = buildStages(trackPlan.items)
  const folderIdOf = (stage: Stage) => stage.goal?.item.id ?? TAIL_ID
  const hasTailStage = stages.some((stage) => !stage.goal)
  const milestoneCount = stages.filter((stage) => stage.goal).length
  // этапы для селекта в форме шага; хвост предлагается всегда — шаг можно вынести за последнюю веху
  const folderOptions: FolderOption[] = stages.map((stage) => ({ id: folderIdOf(stage), label: `Этап ${stage.n} · ${stage.goal ? stage.goal.item.title : 'без вехи'}` }))
  if (!hasTailStage) folderOptions.push({ id: TAIL_ID, label: `Этап ${stages.length + 1} · без вехи` })

  const commit = (next: PlanEdits) => {
    onEdits(next)
    setForm(null)
  }
  const toggleEditing = () => {
    setEditing((previous) => !previous)
    setForm(null)
    setSwapFirst(null)
  }
  const reset = () => {
    const question = builtin
      ? 'Вернуть исходный трек? Все правки шагов и этапов будут стёрты, галочки останутся.'
      : 'Очистить трек? Все его шаги и этапы будут удалены, галочки останутся.'
    if (window.confirm(question)) commit(resetEdits())
  }
  const itemOf = (id: string) => trackPlan.items.find((step) => step.item.id === id)?.item

  const editor: StageEditor = {
    form,
    swapFirst,
    folders: folderOptions,
    onMoveFolder: (id, delta) => commit(moveFolder(edits, baseItems, id, delta)),
    onDeleteFolder: (id) => {
      const stage = stages.find((candidate) => folderIdOf(candidate) === id)
      if (!stage?.goal) return
      const count = stage.steps.length
      const outcome = count === 0 ? 'Шагов в этапе нет.' : `${count} ${plural(count, ['шаг перейдёт', 'шага перейдут', 'шагов перейдут'])} в следующий этап.`
      if (window.confirm(`Удалить веху «${stage.goal.item.title}»? ${outcome}`)) commit(deleteFolder(edits, baseItems, id))
    },
    onEditFolder: (id) => setForm({ kind: 'folder', id }),
    onSaveFolder: (id, fields) => {
      const current = itemOf(id)
      commit(updateFolder(edits, id, current && !edits.addedFolders[id] ? diffFolderFields(current, fields) : fields))
    },
    onAddNode: (folderId) => setForm({ kind: 'new-node', folderId }),
    onMoveNode: (id, delta) => commit(moveNode(edits, baseItems, id, delta)),
    onSwapNode: (id) => {
      if (swapFirst === null) {
        setSwapFirst(id)
        return
      }
      if (swapFirst !== id) commit(swapNodes(edits, baseItems, swapFirst, id))
      setSwapFirst(null)
    },
    onEditNode: (id) => setForm({ kind: 'node', id }),
    onDeleteNode: (id) => {
      const current = itemOf(id)
      if (current && window.confirm(`Удалить шаг «${current.title}»?`)) commit(deleteNode(edits, baseItems, id))
    },
    onSaveNode: (id, folderId, fields) => {
      if (id === null) {
        commit(addNode(edits, baseItems, folderId, fields))
        return
      }
      const current = itemOf(id)
      let next = updateNode(edits, id, current && !edits.addedNodes[id] ? diffNodeFields(current, fields) : fields)
      // смена этапа в форме — перенос в конец выбранного
      const home = stages.find((stage) => stage.steps.some((step) => step.item.id === id))
      if (home && folderIdOf(home) !== folderId) next = moveNodeToFolder(next, baseItems, id, folderId)
      commit(next)
    },
    onCancel: () => setForm(null),
  }

  return (
    <section className={`track ${modifier}`} aria-labelledby={titleId}>
      <header className="track__header">
        <div className="track__header-main">
          <p className="eyebrow">{builtin ? `Трек ${track.id}` : 'Свой трек'}</p>
          <Heading id={titleId} className="track__title">{track.name}</Heading>
          <p className="track__goal">{track.goal}</p>
          <p className="track__meta">
            <span>
              <AnimatedNumber value={trackPlan.done} format={fmtHours} /> / {fmtHours(trackPlan.total)} ч · {percent} %
            </span>
            {skippedSteps.length > 0 && (
              <span>
                отложено · {skippedSteps.length} ш. · {fmtHours(skippedHours)} ч
              </span>
            )}
            <span>финиш · {fmtDateYear(trackPlan.finish)}</span>
          </p>
        </div>
        <ProgressRing
          percent={percent}
          color={trackColor(track.id)}
          label={`Прогресс трека ${builtin ? track.id : `«${track.name}»`}: ${percent} %`}
          size={72}
        />
      </header>

      {afterHeader}

      <PlanEditorPanel
        editing={editing}
        canReset={hasEdits(edits)}
        resetLabel={builtin ? 'Вернуть исходный трек' : 'Очистить трек'}
        swapping={swapFirst !== null}
        onToggle={toggleEditing}
        onReset={reset}
        onCancelSwap={() => setSwapFirst(null)}
      />

      <div className="stages">
        {stages.map((stage, index) => {
          const folderId = folderIdOf(stage)
          return (
            <StageCard
              key={folderId}
              stage={stage}
              folderId={folderId}
              trackId={track.id}
              canMoveUp={index > 0}
              canMoveDown={index < milestoneCount - 1}
              done={done}
              settings={settings}
              skipped={skipped}
              progress={progress}
              onToggle={onToggle}
              onSkip={onSkip}
              onProgress={onProgress}
              editor={editing ? editor : undefined}
            />
          )
        })}
      </div>

      {editing && (
        <div className="editor-add">
          {form?.kind === 'new-folder' && (
            <FolderForm
              idPrefix="new-stage"
              labels={NEW_STAGE_LABELS}
              submitLabel="Добавить этап"
              card
              onSave={(fields) => commit(addFolder(edits, baseItems, fields))}
              onCancel={editor.onCancel}
            />
          )}
          {form?.kind === 'new-node' && form.folderId === TAIL_ID && !hasTailStage && (
            <NodeForm
              idPrefix="new-tail-step"
              folders={folderOptions}
              folderId={TAIL_ID}
              card
              onSave={(fields, folderId) => editor.onSaveNode(null, folderId, fields)}
              onCancel={editor.onCancel}
            />
          )}
          <div className="editor-add__actions">
            <button type="button" className="button" onClick={() => setForm({ kind: 'new-folder' })}>
              + Добавить этап
            </button>
            {!hasTailStage && (
              <button type="button" className="button" onClick={() => setForm({ kind: 'new-node', folderId: TAIL_ID })}>
                + Добавить шаг
              </button>
            )}
          </div>
        </div>
      )}

      {habits.length > 0 && (
        <div className="habits">
          <p className="eyebrow">Привычки трека — не в часах, а каждый день</p>
          <ul className="habit-list">
            {habits.map((habit) => (
              <li className="habit-list__item" key={habit.text}>
                <span className="habit-list__time">{habit.time}</span>
                <span>{habit.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

interface StageCardProps {
  stage: Stage
  /** id вехи этапа; у хвоста без вехи — 'tail' */
  folderId: string
  trackId: string
  canMoveUp: boolean
  canMoveDown: boolean
  done: DoneMap
  settings: Settings
  skipped: SkippedMap
  progress: ProgressMap
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
  editor?: StageEditor
}

function StageCard({ stage, folderId, trackId, canMoveUp, canMoveDown, done, settings, skipped, progress, onToggle, onSkip, onProgress, editor }: StageCardProps) {
  // В знаменателе только шаги «в игре»: отложенные из счёта уходят, как и из расписания
  const counted = stage.steps.filter((step) => isDone(step.item, done) || isScheduled(step.item, settings, skipped))
  const doneSteps = counted.filter((step) => isDone(step.item, done))
  const totalHours = counted.reduce((sum, step) => sum + step.item.hours, 0)
  // частично пройденные курсы идут в счёт этапа своей долей, а не нулём
  const doneHours = counted.reduce((sum, step) => sum + step.item.hours * progressOf(step.item, done, progress), 0)
  const percent = totalHours ? Math.round((doneHours / totalHours) * 100) : 0
  const allDone = counted.length > 0 && doneSteps.length === counted.length
  // Шаги «по желанию» и отложенные остаются в списке, но не в счёте — иначе цифры не сходятся с видимыми строками
  const parked = stage.steps.length - counted.length
  const goalDone = stage.goal ? isDone(stage.goal.item, done) || allDone : false
  const form = editor?.form ?? null

  return (
    <details className="stage" open={!allDone}>
      <summary className="stage__summary">
        <span className="stage__name">
          Этап {stage.n}
          {stage.goal && <span className="stage__goal"> · {stage.goal.item.title}</span>}
          {!stage.goal && <span className="stage__goal"> · дальше, без отдельной вехи</span>}
        </span>
        <span className="stage__count">
          {doneSteps.length}/{counted.length} · {fmtHours(doneHours)} из {fmtHours(totalHours)} ч
          {parked > 0 && <span className="stage__parked"> · {parked} вне расписания</span>}
        </span>
      </summary>

      {editor && (
        <StageTools
          tail={!stage.goal}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onEdit={() => editor.onEditFolder(folderId)}
          onMoveUp={() => editor.onMoveFolder(folderId, -1)}
          onMoveDown={() => editor.onMoveFolder(folderId, 1)}
          onAddNode={() => editor.onAddNode(folderId)}
          onDelete={() => editor.onDeleteFolder(folderId)}
        />
      )}
      {editor && stage.goal && form?.kind === 'folder' && form.id === folderId && (
        <FolderForm
          idPrefix={`stage-${folderId}`}
          initial={{ title: stage.goal.item.title, note: stage.goal.item.note }}
          labels={MILESTONE_LABELS}
          onSave={(fields) => editor.onSaveFolder(folderId, fields)}
          onCancel={editor.onCancel}
        />
      )}

      <span
        className="progress-bar stage__bar"
        role="progressbar"
        aria-label={`Прогресс этапа ${stage.n}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={`progress-bar__fill progress-bar__fill--${trackModifier(trackId)}`} style={{ width: `${percent}%` }} />
      </span>

      {stage.goal && (
        <p className="stage__goal-note">
          {goalDone ? (
            <span className="stage__goal-date">открыто</span>
          ) : stage.goal.finish ? (
            <time className="stage__goal-date" dateTime={toISO(stage.goal.finish)}>
              ≈ {fmtDate(stage.goal.finish)}
            </time>
          ) : (
            <span className="stage__goal-date">—</span>
          )}
          {stage.goal.item.note}
        </p>
      )}

      <ol className="stage__steps">
        {stage.steps.map((step, index) =>
          editor && form?.kind === 'node' && form.id === step.item.id ? (
            <li className="stage__editor" key={step.item.id}>
              <NodeForm
                idPrefix={`step-${step.item.id}`}
                initial={nodeFieldsOf(step.item)}
                folders={editor.folders}
                folderId={folderId}
                onSave={(fields, target) => editor.onSaveNode(step.item.id, target, fields)}
                onCancel={editor.onCancel}
              />
            </li>
          ) : (
            <StepItem
              key={step.item.id}
              step={step}
              checked={isDone(step.item, done)}
              scheduled={isScheduled(step.item, settings, skipped)}
              isSkipped={!!skipped[step.item.id]}
              unitsCompleted={unitsDone(step.item, progress)}
              onToggle={onToggle}
              onSkip={onSkip}
              onProgress={onProgress}
              tools={
                editor && (
                  <StepTools
                    canMoveUp={index > 0}
                    canMoveDown={index < stage.steps.length - 1}
                    swapping={editor.swapFirst === step.item.id}
                    onMoveUp={() => editor.onMoveNode(step.item.id, -1)}
                    onMoveDown={() => editor.onMoveNode(step.item.id, 1)}
                    onSwap={() => editor.onSwapNode(step.item.id)}
                    onEdit={() => editor.onEditNode(step.item.id)}
                    onDelete={() => editor.onDeleteNode(step.item.id)}
                  />
                )
              }
            />
          ),
        )}
        {editor && form?.kind === 'new-node' && form.folderId === folderId && (
          <li className="stage__editor">
            <NodeForm
              idPrefix={`new-${folderId}`}
              folders={editor.folders}
              folderId={folderId}
              onSave={(fields, target) => editor.onSaveNode(null, target, fields)}
              onCancel={editor.onCancel}
            />
          </li>
        )}
      </ol>
    </details>
  )
}

interface StepItemProps {
  step: ItemPlan
  checked: boolean
  scheduled: boolean
  isSkipped: boolean
  unitsCompleted: number
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onProgress: (id: string, value: number) => void
  /** Ряд инструментов редактора — только в режиме редактирования */
  tools?: ReactNode
}

/** Подпись ссылки по домену: пользователь должен понимать, куда уйдёт, ещё до клика */
function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.endsWith('udemy.com')) return 'Курс на Udemy'
    if (host.endsWith('stepik.org')) return 'Курс на Stepik'
    if (host.endsWith('youtube.com') || host === 'youtu.be') return 'Плейлист на YouTube'
    return `Материал: ${host}`
  } catch {
    return 'Материал'
  }
}

/** Родительный падеж после «из N»: 61 урока, но 129 уроков */
const UNIT_ONE: Record<string, string> = { уроков: 'урока', шагов: 'шага', задач: 'задачи' }

function unitLabel(total: number, word: string): string {
  const single = total % 10 === 1 && total % 100 !== 11
  return single ? UNIT_ONE[word] ?? word : word
}

/** Польза шага для цели трека: зелёный — брать обязательно, янтарный — по остаточному принципу, серый — можно не брать */
function ValueBadge({ value }: { value?: number }) {
  if (typeof value !== 'number') return null
  const band = value >= 80 ? 'high' : value >= 50 ? 'mid' : 'low'
  return (
    <span className={`badge badge--value-${band}`} title="Насколько шаг приближает к цели трека за свои часы">
      польза {value} %
    </span>
  )
}

/** Источники шага: основной материал и, если он есть, разбор темы на видео */
function StepSource({ item }: { item: Item }) {
  const links: { url: string; label: string }[] = []
  if (item.url) links.push({ url: item.url, label: sourceLabel(item.url) })
  if (item.videoUrl) {
    links.push({ url: item.videoUrl, label: item.videoTitle ? `Видео: ${item.videoTitle}` : sourceLabel(item.videoUrl) })
  }
  if (!links.length) return null

  return (
    <p className="step__source">
      {links.map((link, i) => (
        <span key={link.url}>
          {i > 0 && ' · '}
          <a className="step__source-link" href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
            <span aria-hidden="true"> ↗</span>
            <span className="visually-hidden"> (откроется в новой вкладке)</span>
          </a>
        </span>
      ))}
    </p>
  )
}

/**
 * Ручной счётчик пройденного по шагу. Считаем в уроках, если их число известно,
 * иначе в процентах — так полоса появляется у каждого шага, а не только у курсов с разбивкой.
 */
function StepProgress({ item, value, onProgress }: { item: Item; value: number; onProgress: (id: string, value: number) => void }) {
  const total = unitsOf(item)
  const percent = total ? Math.round((value / total) * 100) : 0
  const inputId = `${item.id}-progress`

  return (
    <div className="step__progress">
      <span
        className="progress-bar step__progress-bar"
        role="progressbar"
        aria-label={`Пройдено по шагу «${item.title}»`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={item.units ? `${value} из ${total} ${item.unitWord ?? 'уроков'}` : `${percent} %`}
      >
        <span className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </span>
      <p className="step__progress-row">
        <label className="step__progress-label" htmlFor={inputId}>
          пройдено
        </label>
        <input
          className="step__progress-input"
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          max={total}
          step={1}
          value={value}
          onChange={(event) => onProgress(item.id, Number(event.target.value))}
        />
        <span className="step__progress-total">{item.units ? `из ${total} ${unitLabel(total, item.unitWord ?? 'уроков')} · ${percent} %` : '%'}</span>
        {value > 0 && (
          <button type="button" className="link-button step__progress-reset" onClick={() => onProgress(item.id, 0)}>
            сбросить
          </button>
        )}
      </p>
    </div>
  )
}

function StepItem({ step, checked, scheduled, isSkipped, unitsCompleted, onToggle, onSkip, onProgress, tools }: StepItemProps) {
  const item: Item = step.item
  const locked = Boolean(item.done)

  if (isSkipped && !checked) {
    return (
      <li className="step step--skipped">
        <span className="step__pause" aria-hidden="true">
          <PauseIcon />
        </span>
        <p className="step__title step__title--plain">
          {item.title}
          {item.meta && <span className="step__meta"> · {item.meta}</span>}
          <span className="badge badge--skipped">отложено</span>
          <ValueBadge value={item.value} />
        </p>
        <StepSource item={item} />
        <p className="step__hours">
          <span className="step__hours-value">{fmtHours(item.hours)} ч</span>
          <button type="button" className="link-button step__defer" onClick={() => onSkip(item.id)}>
            вернуть в план
          </button>
        </p>
        {tools}
      </li>
    )
  }

  const parked = !scheduled && !checked
  const noteId = `${item.id}-note`
  const className = ['step', checked ? 'step--done' : '', parked ? 'step--parked' : ''].filter(Boolean).join(' ')

  return (
    <li className={className}>
      <input
        className="step__checkbox"
        type="checkbox"
        id={item.id}
        checked={checked}
        disabled={locked}
        aria-describedby={noteId}
        onChange={() => onToggle(item.id)}
      />
      <label className="step__title" htmlFor={item.id}>
        <span className="step__name">{item.title}</span>
        {item.meta && <span className="step__meta"> · {item.meta}</span>}
        {item.kind === 'free' && <span className="badge badge--free">бесплатно</span>}
        {item.kind === 'practice' && <span className="badge badge--practice">практика</span>}
        {item.optional && <span className="badge badge--optional">по желанию</span>}
        <ValueBadge value={item.value} />
      </label>
      <StepSource item={item} />
      <details className="step__details">
        <summary className="step__details-summary">что именно проходить</summary>
        <p className="step__note" id={noteId}>{item.note}</p>
      </details>
      {!locked && !checked && <StepProgress item={item} value={unitsCompleted} onProgress={onProgress} />}
      <p className="step__hours">
        <span className="step__hours-value">{locked ? 'готово' : checked ? 'отмечено' : `${fmtHours(item.hours)} ч`}</span>
        {!locked && !checked && (
          <>
            {item.video ? `${formatNumber(item.video)} ч видео${item.factor ? ` · ×${formatNumber(item.factor)}` : ''}` : 'вне Udemy'}
            <br />
            {parked ? 'не в расписании' : step.finish ? `к ${fmtDate(step.finish)}` : ''}
          </>
        )}
        {!locked && !checked && !parked && (
          <button type="button" className="link-button step__defer" onClick={() => onSkip(item.id)}>
            отложить
          </button>
        )}
      </p>
      {tools}
    </li>
  )
}
