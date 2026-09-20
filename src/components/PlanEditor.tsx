import { useState, type FormEvent, type ReactNode } from 'react'
import { NODE_KINDS, type FolderFields, type NodeFields } from '../planEdits'

/** Этап в селекте формы шага */
export interface FolderOption {
  id: string
  label: string
}

/** Форма слова по числу: 1 шаг, 2 шага, 5 шагов */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

interface ToolButtonProps {
  /** Текст для скринридера у иконочной кнопки */
  label?: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolButton({ label, pressed, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`edit-tools__button${pressed ? ' edit-tools__button--active' : ''}`}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface PlanEditorPanelProps {
  editing: boolean
  /** Есть что сбрасывать — кнопка возврата показывается только тогда */
  canReset: boolean
  resetLabel: string
  /** Первый шаг обмена выбран — ждём второй */
  swapping: boolean
  onToggle: () => void
  onReset: () => void
  onCancelSwap: () => void
}

export function PlanEditorPanel({ editing, canReset, resetLabel, swapping, onToggle, onReset, onCancelSwap }: PlanEditorPanelProps) {
  return (
    <div className="plan-editor">
      <button type="button" className={`button${editing ? ' button--active' : ''}`} aria-pressed={editing} onClick={onToggle}>
        {editing ? 'Готово' : 'Редактировать трек'}
      </button>
      {editing && <p className="plan-editor__hint">Правки хранятся в этом браузере и попадают в экспорт</p>}
      {editing && canReset && (
        <button type="button" className="link-button" onClick={onReset}>
          {resetLabel}
        </button>
      )}
      {editing && swapping && (
        <p className="plan-editor__swap" role="status">
          Выберите второй элемент для обмена
          <button type="button" className="link-button" onClick={onCancelSwap}>
            Отменить
          </button>
        </p>
      )}
    </div>
  )
}

interface StageToolsProps {
  /** Хвост без вехи: править и удалять нечего, двигать некуда */
  tail: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddNode: () => void
  onDelete: () => void
}

export function StageTools({ tail, canMoveUp, canMoveDown, onEdit, onMoveUp, onMoveDown, onAddNode, onDelete }: StageToolsProps) {
  return (
    <div className="edit-tools edit-tools--stage">
      {!tail && <ToolButton onClick={onEdit}>✎ Изменить веху</ToolButton>}
      {!tail && (
        <ToolButton label="Переместить этап выше" disabled={!canMoveUp} onClick={onMoveUp}>
          ↑
        </ToolButton>
      )}
      {!tail && (
        <ToolButton label="Переместить этап ниже" disabled={!canMoveDown} onClick={onMoveDown}>
          ↓
        </ToolButton>
      )}
      <ToolButton onClick={onAddNode}>+ Добавить шаг</ToolButton>
      {!tail && <ToolButton onClick={onDelete}>× Удалить веху</ToolButton>}
    </div>
  )
}

interface StepToolsProps {
  canMoveUp: boolean
  canMoveDown: boolean
  /** Этот шаг выбран первым для обмена */
  swapping: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onSwap: () => void
  onEdit: () => void
  onDelete: () => void
}

export function StepTools({ canMoveUp, canMoveDown, swapping, onMoveUp, onMoveDown, onSwap, onEdit, onDelete }: StepToolsProps) {
  return (
    <div className="edit-tools edit-tools--step">
      <ToolButton label="Переместить шаг выше" disabled={!canMoveUp} onClick={onMoveUp}>
        ↑
      </ToolButton>
      <ToolButton label="Переместить шаг ниже" disabled={!canMoveDown} onClick={onMoveDown}>
        ↓
      </ToolButton>
      <ToolButton label="Поменять местами с другим шагом" pressed={swapping} onClick={onSwap}>
        ⇄
      </ToolButton>
      <ToolButton label="Изменить шаг" onClick={onEdit}>
        ✎
      </ToolButton>
      <ToolButton label="Удалить шаг" onClick={onDelete}>
        ×
      </ToolButton>
    </div>
  )
}

/* ───────────── формы шага и вехи ───────────── */

const KIND_LABEL: Record<NodeFields['kind'], string> = { course: 'курс', free: 'бесплатный', practice: 'практика' }

interface NodeDraft {
  title: string
  kind: NodeFields['kind']
  meta: string
  note: string
  hours: string
  video: string
  factor: string
  optional: boolean
  url: string
  units: string
  unitWord: string
  value: string
  folderId: string
}

/** Число в поле: ноль и «не задано» выглядят одинаково — пустым полем */
const numberText = (n?: number): string => (typeof n === 'number' && n > 0 ? String(n) : '')

function toDraft(initial: NodeFields | undefined, folderId: string): NodeDraft {
  return {
    title: initial?.title ?? '',
    kind: initial?.kind ?? 'course',
    meta: initial?.meta ?? '',
    note: initial?.note ?? '',
    hours: numberText(initial?.hours),
    video: numberText(initial?.video),
    factor: numberText(initial?.factor),
    optional: !!initial?.optional,
    url: initial?.url ?? '',
    units: numberText(initial?.units),
    unitWord: initial?.unitWord ?? '',
    value: numberText(initial?.value),
    folderId,
  }
}

/** Пустое поле — undefined, иначе число в границах; запятая как десятичный разделитель тоже годится */
function optionalNumber(text: string, max = Infinity, integer = false): number | undefined {
  if (text.trim() === '') return undefined
  const n = Number(text.replace(',', '.'))
  if (!Number.isFinite(n)) return undefined
  const bounded = Math.min(max, Math.max(0, n))
  return integer ? Math.round(bounded) : bounded
}

const optionalText = (text: string): string | undefined => text.trim() || undefined

function toFields(draft: NodeDraft): NodeFields {
  return {
    kind: draft.kind,
    title: draft.title.trim(),
    meta: optionalText(draft.meta),
    note: draft.note.trim(),
    hours: optionalNumber(draft.hours) ?? 0,
    video: optionalNumber(draft.video),
    factor: optionalNumber(draft.factor),
    optional: draft.optional || undefined,
    url: optionalText(draft.url),
    units: optionalNumber(draft.units, Infinity, true),
    unitWord: optionalText(draft.unitWord),
    value: optionalNumber(draft.value, 100, true),
  }
}

interface NodeFormProps {
  /** Префикс id полей — на странице бывает несколько форм */
  idPrefix: string
  /** Без initial — форма нового шага */
  initial?: NodeFields
  folders: FolderOption[]
  folderId: string
  /** Отдельной карточкой, вне списка шагов */
  card?: boolean
  onSave: (fields: NodeFields, folderId: string) => void
  onCancel: () => void
}

export function NodeForm({ idPrefix, initial, folders, folderId, card, onSave, onCancel }: NodeFormProps) {
  const [draft, setDraft] = useState<NodeDraft>(() => toDraft(initial, folderId))
  const update = (patch: Partial<NodeDraft>) => setDraft((previous) => ({ ...previous, ...patch }))
  const field = (name: string) => `${idPrefix}-${name}`
  const heading = initial ? 'Шаг' : 'Новый шаг'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const fields = toFields(draft)
    if (!fields.title) return
    onSave(fields, draft.folderId)
  }

  return (
    <form className={`node-editor${card ? ' node-editor--card' : ''}`} onSubmit={submit} aria-label={heading}>
      <p className="node-editor__title">{heading}</p>
      <div className="node-editor__grid">
        <p className="node-editor__field node-editor__field--wide">
          <label className="node-editor__label" htmlFor={field('title')}>Название</label>
          <input
            id={field('title')}
            className="node-editor__input"
            type="text"
            required
            maxLength={200}
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('kind')}>Тип</label>
          <select
            id={field('kind')}
            className="node-editor__input"
            value={draft.kind}
            onChange={(event) => update({ kind: NODE_KINDS.find((kind) => kind === event.target.value) ?? 'course' })}
          >
            {NODE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('folder')}>Этап</label>
          <select id={field('folder')} className="node-editor__input" value={draft.folderId} onChange={(event) => update({ folderId: event.target.value })}>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </select>
        </p>
        <p className="node-editor__field node-editor__field--wide">
          <label className="node-editor__label" htmlFor={field('meta')}>Meta</label>
          <input
            id={field('meta')}
            className="node-editor__input"
            type="text"
            maxLength={200}
            placeholder="Инструктор, язык, пометки"
            value={draft.meta}
            onChange={(event) => update({ meta: event.target.value })}
          />
        </p>
        <p className="node-editor__field node-editor__field--wide">
          <label className="node-editor__label" htmlFor={field('note')}>Пояснение</label>
          <textarea
            id={field('note')}
            className="node-editor__input node-editor__textarea"
            rows={3}
            placeholder="Что проходить, что пропускать, зачем"
            value={draft.note}
            onChange={(event) => update({ note: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('hours')}>Часы</label>
          <input
            id={field('hours')}
            className="node-editor__input"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={draft.hours}
            onChange={(event) => update({ hours: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('video')}>Видео, ч</label>
          <input
            id={field('video')}
            className="node-editor__input"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={draft.video}
            onChange={(event) => update({ video: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('factor')}>Коэффициент</label>
          <input
            id={field('factor')}
            className="node-editor__input"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={draft.factor}
            onChange={(event) => update({ factor: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('units')}>Единиц</label>
          <input
            id={field('units')}
            className="node-editor__input"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={draft.units}
            onChange={(event) => update({ units: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('unit-word')}>Слово единиц</label>
          <input
            id={field('unit-word')}
            className="node-editor__input"
            type="text"
            maxLength={30}
            placeholder="уроков / шагов / задач"
            value={draft.unitWord}
            onChange={(event) => update({ unitWord: event.target.value })}
          />
        </p>
        <p className="node-editor__field">
          <label className="node-editor__label" htmlFor={field('value')}>Польза, %</label>
          <input
            id={field('value')}
            className="node-editor__input"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={draft.value}
            onChange={(event) => update({ value: event.target.value })}
          />
        </p>
        <p className="node-editor__field node-editor__field--wide">
          <label className="node-editor__label" htmlFor={field('url')}>Ссылка</label>
          <input
            id={field('url')}
            className="node-editor__input"
            type="url"
            placeholder="https://…"
            value={draft.url}
            onChange={(event) => update({ url: event.target.value })}
          />
        </p>
        <label className="node-editor__toggle">
          <input className="node-editor__checkbox" type="checkbox" checked={draft.optional} onChange={(event) => update({ optional: event.target.checked })} />
          По желанию
        </label>
      </div>
      <div className="node-editor__actions">
        <button type="submit" className="button">
          Сохранить
        </button>
        <button type="button" className="link-button" onClick={onCancel}>
          Отменить
        </button>
      </div>
    </form>
  )
}

/** Подписи формы вехи; форма своего трека передаёт свои */
export const MILESTONE_LABELS = { heading: 'Веха', title: 'Название', note: 'Пояснение' }
export const NEW_STAGE_LABELS = { heading: 'Новый этап', title: 'Название вехи', note: 'Пояснение' }

interface FolderFormProps {
  idPrefix: string
  initial?: FolderFields
  labels: { heading: string; title: string; note: string }
  submitLabel?: string
  /** Отдельной карточкой, вне этапа */
  card?: boolean
  onSave: (fields: FolderFields) => void
  onCancel: () => void
}

export function FolderForm({ idPrefix, initial, labels, submitLabel = 'Сохранить', card, onSave, onCancel }: FolderFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), note: note.trim() })
  }

  return (
    <form className={`folder-editor${card ? ' folder-editor--card' : ''}`} onSubmit={submit} aria-label={labels.heading}>
      <p className="folder-editor__title">{labels.heading}</p>
      <div className="folder-editor__grid">
        <p className="folder-editor__field folder-editor__field--wide">
          <label className="folder-editor__label" htmlFor={`${idPrefix}-title`}>{labels.title}</label>
          <input
            id={`${idPrefix}-title`}
            className="folder-editor__input"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </p>
        <p className="folder-editor__field folder-editor__field--wide">
          <label className="folder-editor__label" htmlFor={`${idPrefix}-note`}>{labels.note}</label>
          <textarea
            id={`${idPrefix}-note`}
            className="folder-editor__input folder-editor__textarea"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </p>
      </div>
      <div className="folder-editor__actions">
        <button type="submit" className="button">
          {submitLabel}
        </button>
        <button type="button" className="link-button" onClick={onCancel}>
          Отменить
        </button>
      </div>
    </form>
  )
}
