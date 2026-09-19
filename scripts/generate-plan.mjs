// Статический план для ИИ-ассистентов и краулеров: сайт — SPA, сервер отдаёт пустой index.html,
// и без этого файла содержимое снаружи не прочитать. Собирает public/plan.md из src/data.ts;
// запускается перед vite build (npm run plan), сам файл в git не хранится — он всегда свежий на деплое.
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://pafuluofu-dev.github.io/verno-roadmap/'

// Vite сам читает TypeScript и JSON-импорты данных — отдельный компилятор не нужен
const vite = await createServer({ root, server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error' })
let data
try {
  data = await vite.ssrLoadModule('/src/data.ts')
} finally {
  await vite.close()
}
const { ITEMS, TRACKS, HABITS, SKIPPED, UNI_DATE, DEFAULT_START } = data

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`)].join('\n')
const link = (url) => (url ? `[ссылка](${url})` : '—')
const KIND = { course: 'курс', free: 'бесплатный курс', practice: 'практика', milestone: 'веха' }
const ACTION = { never: 'не возвращаться', 'on-demand': 'под заказ', later: 'позже' }
const status = (item) => (item.done ? 'пройдено' : item.optional ? 'по желанию' : '—')
const hours = (track, optional) =>
  ITEMS.filter((item) => item.track === track && !!item.optional === optional).reduce((sum, item) => sum + item.hours, 0)

const lines = []
lines.push('# Маршрут verno/dev — учебный план', '')
lines.push(
  `> Статический слепок плана с сайта ${SITE} — сайт одностраничный, и без этого файла его содержимое снаружи не прочитать. Собирается при каждой сборке из src/data.ts. Галочки прогресса хранятся только в браузере владельца и здесь не отражены.`,
  '',
)
lines.push(`- Сгенерировано: ${new Date().toISOString().slice(0, 10)}`)
lines.push(`- Старт плана по умолчанию: ${DEFAULT_START} (понедельник)`)
lines.push(`- Возвращение в вуз: ${UNI_DATE} — после этой даты темп падает`)
for (const track of TRACKS) lines.push(`- Трек ${track.id}: ${hours(track.id, false)} ч по основной ветке + ${hours(track.id, true)} ч по желанию`)
lines.push('')

for (const track of TRACKS) {
  const items = ITEMS.filter((item) => item.track === track.id)
  lines.push(`## Трек ${track.id} — ${track.name}`, '', `Цель: ${track.goal}`, '')
  lines.push(
    table(
      ['#', 'Шаг', 'Тип', 'Meta', 'Часы', 'Польза, %', 'Статус', 'Ссылка'],
      items.map((item, index) => [
        index + 1,
        item.title,
        KIND[item.kind] ?? item.kind,
        item.meta ?? '',
        item.hours,
        item.value ?? '—',
        status(item),
        link(item.url),
      ]),
    ),
    '',
  )
  lines.push('### Пояснения к шагам', '')
  for (const item of items) lines.push(`- **${item.title}** — ${item.note}`)
  lines.push('')
}

lines.push('## Привычки', '', table(['Трек', 'Когда', 'Что'], HABITS.map((habit) => [habit.track, habit.time, habit.text])), '')
lines.push(
  '## Мимо плана — что есть в библиотеке и не стало шагом',
  '',
  table(
    ['Трек', 'Курс', 'Meta', 'Почему', 'Вернуться, %', 'Что делать', 'Условие', 'Ссылка'],
    SKIPPED.map((item) => [item.track, item.title, item.meta, item.why, item.returnValue, ACTION[item.action] ?? item.action, item.trigger, link(item.url)]),
  ),
  '',
)

writeFileSync(resolve(root, 'public/plan.md'), lines.join('\n') + '\n')
console.log(`plan.md: ${ITEMS.length} шагов, ${HABITS.length} привычек, ${SKIPPED.length} мимо плана`)
