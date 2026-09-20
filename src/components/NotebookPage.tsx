import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { makeNoteId, NOTEBOOK_HELP, NOTEBOOK_SNIPPETS, type Snippet, type UserNote } from '../data/notebook'
import { fmtDateYear, parseISO, todayISO } from '../schedule'
import { Markdown } from './Markdown'

interface NotebookPageProps {
  notes: UserNote[]
  onSave: (note: UserNote) => void
  onDelete: (id: string) => void
}

type Mode = { kind: 'view'; id: string } | { kind: 'edit'; id: string | null } | { kind: 'empty' }

/** Первая строка текста без разметки — для превью в списке */
function excerpt(body: string): string {
  const line = body
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith('$$') && !item.startsWith('|') && !item.startsWith('---'))
  return (line ?? '').replace(/^[#>\-*\d.)\s]+/, '').replace(/\*\*/g, '').replace(/\$[^$]*\$/g, '…').slice(0, 120)
}

/** Своя тетрадь: список слева, справа — просмотр или редактор с живым превью. Модуль отдельный — тянет KaTeX */
export function NotebookPage({ notes, onSave, onDelete }: NotebookPageProps) {
  const sorted = useMemo(() => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt)), [notes])
  const [mode, setMode] = useState<Mode>(() => (sorted.length ? { kind: 'view', id: sorted[0].id } : { kind: 'empty' }))

  // Удалили просматриваемую заметку — показываем следующую, либо пустое состояние
  const current = mode.kind === 'view' ? sorted.find((note) => note.id === mode.id) : undefined
  useEffect(() => {
    if (mode.kind === 'view' && !current) setMode(sorted.length ? { kind: 'view', id: sorted[0].id } : { kind: 'empty' })
  }, [mode, current, sorted])

  const remove = (note: UserNote) => {
    if (!window.confirm(`Удалить заметку «${note.title}»? Отменить нельзя.`)) return
    onDelete(note.id)
  }

  const editing = mode.kind === 'edit' ? (mode.id ? sorted.find((note) => note.id === mode.id) : undefined) : undefined

  return (
    <main className="notebook">
      <header className="page-head">
        <p className="eyebrow">Свои записи · Markdown и LaTeX</p>
        <h1 className="page-head__title">Заметки</h1>
        <p className="page-head__lead">
          Свои конспекты по курсам, заметки к заказам и шпаргалки. Разметка простая: заголовки, списки, таблицы, жирный; при желании формулы в{' '}
          <code>$…$</code> через KaTeX. Хранятся в этом браузере и попадают в экспорт на обзоре.
        </p>
      </header>

      <div className="notebook__layout">
        <aside className="notebook__list" aria-label="Список заметок">
          <button type="button" className="button button--primary" onClick={() => setMode({ kind: 'edit', id: null })}>
            Новая заметка
          </button>
          {sorted.length > 0 && (
            <ol className="notebook__items">
              {sorted.map((note) => {
                const isCurrent = (mode.kind === 'view' && mode.id === note.id) || (mode.kind === 'edit' && mode.id === note.id)
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      className={`notebook__item${isCurrent ? ' notebook__item--current' : ''}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => setMode({ kind: 'view', id: note.id })}
                    >
                      <span className="notebook__item-title">{note.title}</span>
                      <span className="notebook__item-meta">{fmtDateYear(parseISO(note.updatedAt))}</span>
                      {excerpt(note.body) && <span className="notebook__item-excerpt">{excerpt(note.body)}</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </aside>

        {mode.kind === 'edit' ? (
          <NoteEditor
            key={mode.id ?? 'new'}
            initial={editing}
            onSave={(note) => {
              onSave(note)
              setMode({ kind: 'view', id: note.id })
            }}
            onCancel={() => setMode(editing ? { kind: 'view', id: editing.id } : sorted.length ? { kind: 'view', id: sorted[0].id } : { kind: 'empty' })}
          />
        ) : current ? (
          <article className="notebook__view" aria-labelledby="notebook-view-title">
            <header className="notebook__view-head">
              <h2 id="notebook-view-title" className="notebook__view-title">
                {current.title}
              </h2>
              <p className="notebook__view-meta">
                создано {fmtDateYear(parseISO(current.createdAt))}
                {current.updatedAt !== current.createdAt && ` · изменено ${fmtDateYear(parseISO(current.updatedAt))}`}
              </p>
            </header>
            <div className="notebook__body">
              <Markdown text={current.body} />
            </div>
            <p className="notebook__actions">
              <button type="button" className="button" onClick={() => setMode({ kind: 'edit', id: current.id })}>
                Редактировать
              </button>
              <button type="button" className="link-button" onClick={() => remove(current)}>
                удалить заметку
              </button>
            </p>
          </article>
        ) : (
          <section className="notebook__view notebook__view--empty" aria-label="Заметок нет">
            <p className="notebook__empty">Заметок пока нет. Нажмите «Новая заметка» — заголовки, списки и таблицы, шпаргалка по разметке под редактором.</p>
          </section>
        )}
      </div>
    </main>
  )
}

interface NoteEditorProps {
  /** Нет — новая заметка */
  initial?: UserNote
  onSave: (note: UserNote) => void
  onCancel: () => void
}

function NoteEditor({ initial, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  // Превью отстаёт от набора на кадр-другой: KaTeX не тормозит ввод в длинной заметке
  const previewBody = useDeferredValue(body)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const canSave = title.trim().length > 0 || body.trim().length > 0

  const save = () => {
    if (!canSave) return
    const today = todayISO()
    onSave({
      id: initial?.id ?? makeNoteId(),
      title: title.trim() || 'Без названия',
      body,
      createdAt: initial?.createdAt ?? today,
      updatedAt: today,
    })
  }

  const insert = (snippet: Snippet) => {
    const textarea = bodyRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = body.slice(start, end)
    const middle = selected || snippet.placeholder
    const next = body.slice(0, start) + snippet.before + middle + snippet.after + body.slice(end)
    setBody(next)
    // Подставленный образец выделяем — его сразу можно перепечатать
    const selectFrom = start + snippet.before.length
    const selectTo = selectFrom + middle.length
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(selected ? selectTo : selectFrom, selectTo)
    })
  }

  return (
    <form
      className="notebook__editor"
      aria-label={initial ? 'Редактирование заметки' : 'Новая заметка'}
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <div className="notebook__field">
        <label className="notebook__label" htmlFor="notebook-title">
          Название
        </label>
        <input
          ref={titleRef}
          className="notebook__input"
          id="notebook-title"
          type="text"
          value={title}
          placeholder="Например: деплой WordPress на Hostinger — шаги"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="notebook__pane">
        <div className="notebook__field">
          <label className="notebook__label" htmlFor="notebook-body">
            Текст заметки
          </label>
          <div className="notebook__toolbar" role="toolbar" aria-label="Вставить разметку">
            {NOTEBOOK_SNIPPETS.map((snippet) => (
              <button type="button" className="notebook__tool" key={snippet.label} title={snippet.title} aria-label={snippet.title} onClick={() => insert(snippet)}>
                {snippet.label}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            className="notebook__textarea"
            id="notebook-body"
            value={body}
            spellCheck={false}
            placeholder={'## Заголовок\n\nТекст, **термин** и список:\n\n- что сделать\n- что проверить'}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault()
                save()
              }
            }}
          />
          <p className="notebook__hint">Ctrl+S — сохранить. Жирный — **так**, список — строки с «- », формула — $…$.</p>
        </div>

        <div className="notebook__field">
          <p className="notebook__label" id="notebook-preview-title">
            Предпросмотр
          </p>
          <div className="notebook__preview notebook__body" aria-labelledby="notebook-preview-title" aria-live="polite">
            {previewBody.trim() ? <Markdown text={previewBody} /> : <p className="notebook__empty">Здесь появится оформленная заметка.</p>}
          </div>
        </div>
      </div>

      <p className="notebook__actions">
        <button type="submit" className="button button--primary" disabled={!canSave}>
          Сохранить
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Отменить
        </button>
      </p>

      <details className="notebook__help">
        <summary className="notebook__help-summary">Шпаргалка по разметке</summary>
        <table className="notebook__help-table">
          <tbody>
            {NOTEBOOK_HELP.map(([syntax, meaning]) => (
              <tr key={syntax}>
                <td>
                  <code>{syntax}</code>
                </td>
                <td>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </form>
  )
}
