import { useState } from 'react'

interface BackupSectionProps {
  onExport: () => string
  onImport: (raw: string) => boolean
}

export function BackupSection({ onExport, onImport }: BackupSectionProps) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')

  const doExport = async () => {
    const data = onExport()
    setValue(data)
    try {
      await navigator.clipboard.writeText(data)
      setMessage('Скопировано в буфер. Перешли строку себе (например, в «Избранное» в Telegram) и вставь на другом устройстве.')
    } catch {
      setMessage('Строка в поле ниже — скопируй её вручную.')
    }
  }

  const doImport = () => {
    if (!value.trim()) {
      setMessage('Сначала вставь строку резервной копии в поле.')
      return
    }
    if (!window.confirm('Импортировать копию? Текущие галочки, отложенные шаги, настройки, напоминалки и заметки будут заменены.')) return
    setMessage(
      onImport(value.trim())
        ? 'Готово: галочки, отложенные шаги, настройки, напоминалки и заметки применены.'
        : 'Не получилось разобрать строку — проверь, что это полная копия из этого раздела.',
    )
  }

  return (
    <section className="page-section" aria-labelledby="backup-title">
      <details className="section-fold">
        <summary className="section-fold__summary">
          <h2 id="backup-title">Перенос между устройствами</h2>
          <span className="section-fold__hint" aria-hidden="true" />
        </summary>
        <p className="section-lead section-fold__lead">
          Прогресс хранится в localStorage конкретного браузера. Экспорт собирает всё (галочки, отложенные, настройки, напоминалки, заметки) в одну строку — импорт на другом
          устройстве применяет её. Тема — настройка устройства и не переносится.
        </p>
        <textarea
        className="backup__area"
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Сюда ляжет строка экспорта — или вставь копию с другого устройства"
        aria-label="Строка резервной копии"
      />
        <div className="backup__actions">
          <button type="button" className="button" onClick={doExport}>
            Экспортировать
          </button>
          <button type="button" className="button" onClick={doImport}>
            Импортировать
          </button>
        </div>
        {message && (
          <p className="backup__message" role="status">
            {message}
          </p>
        )}
      </details>
    </section>
  )
}
