import clientBrief from './notebook/client-brief.md?raw'
import clientBriefEn from './notebook/client-brief-en.md?raw'
import pokerLesson from './notebook/poker-socketio-lesson.md?raw'
import tzDoc from './notebook/sales-tz.md?raw'
import contractDoc from './notebook/sales-contract.md?raw'
import outreachDoc from './notebook/outreach.md?raw'
import cvDoc from './notebook/cv-two.md?raw'
import queriesDoc from './notebook/job-search.md?raw'

/** Своя заметка владельца: Markdown-подмножество плюс формулы $…$ и $$…$$ */
export interface UserNote {
  id: string
  title: string
  body: string
  /** ISO-дата создания */
  createdAt: string
  /** ISO-дата последней правки — по ней список отсортирован */
  updatedAt: string
}

/* Стартовые заметки выдаются по одному разу — по списку показанных в storage.ts,
   поэтому новая доезжает и до заведённой тетради. Дальше это обычная заметка:
   её можно править и удалять, назад она не вернётся. */
export const SEED_NOTES: UserNote[] = [
  {
    id: 'seed-client-brief',
    title: 'Бриф на разработку сайта: опросный лист для клиента',
    body: clientBrief,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
  {
    id: 'seed-client-brief-en',
    title: 'Website Design Brief: опросный лист для иностранного клиента',
    body: clientBriefEn,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
  {
    id: 'seed-sales-tz',
    title: 'Техническое задание: шаблон под договор',
    body: tzDoc,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
  {
    id: 'seed-sales-contract',
    title: 'Договор оказания услуг: черновик под проверку юристом',
    body: contractDoc,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
  {
    id: 'seed-outreach',
    title: 'Письмо студиям на субподряд и список адресатов',
    body: outreachDoc,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
  {
    id: 'seed-cv-two',
    title: 'Два резюме: верстальщик и контент-менеджер сайта',
    body: cvDoc,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
  {
    id: 'seed-poker-lesson',
    title: 'Покер на Socket.IO: разбор чужого кода к шагу b-socketio',
    body: pokerLesson,
    createdAt: '2026-09-23',
    updatedAt: '2026-09-23',
  },
  {
    id: 'seed-job-search',
    title: 'Поиск вакансий: запросы, площадки, ритм откликов, воронка',
    body: queriesDoc,
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  },
]

export function makeNoteId(): string {
  return `note-${Date.now().toString(36)}`
}

/** Кнопка панели: оборачивает выделение (или подставляет placeholder) в before…after */
export interface Snippet {
  label: string
  title: string
  before: string
  after: string
  placeholder: string
}

/* Сначала текстовая разметка — она нужна в каждой заметке, формулы реже */
export const NOTEBOOK_SNIPPETS: Snippet[] = [
  { label: '**b**', title: 'Жирный', before: '**', after: '**', placeholder: 'термин' },
  { label: '##', title: 'Заголовок', before: '\n## ', after: '\n', placeholder: 'Заголовок' },
  { label: '– список', title: 'Список', before: '\n- ', after: '', placeholder: 'пункт' },
  { label: '> блок', title: 'Выделенный блок', before: '\n> ', after: '\n', placeholder: 'определение' },
  { label: '| таблица', title: 'Таблица', before: '\n| ', after: ' | Колонка |\n|---|---|\n| … | … |\n', placeholder: 'Колонка' },
  { label: '$x$', title: 'Формула в строке', before: '$', after: '$', placeholder: 'x^2' },
  { label: '$$', title: 'Выключная формула', before: '\n$$\n', after: '\n$$\n', placeholder: '\\lim_{x\\to\\infty} f(x)' },
  { label: 'a/b', title: 'Дробь', before: '\\frac{', after: '}{b}', placeholder: 'a' },
  { label: 'lim', title: 'Предел', before: '\\lim_{', after: '}', placeholder: 'x\\to\\infty' },
  { label: '√', title: 'Корень', before: '\\sqrt{', after: '}', placeholder: 'x' },
  { label: 'xⁿ', title: 'Степень', before: '^{', after: '}', placeholder: 'n' },
  { label: 'xₙ', title: 'Индекс', before: '_{', after: '}', placeholder: 'n' },
  { label: '∫', title: 'Интеграл', before: '\\int_{', after: '}^{b} f(x)\\,dx', placeholder: 'a' },
  { label: 'Σ', title: 'Сумма', before: '\\sum_{', after: '}^{\\infty}', placeholder: 'n=1' },
  { label: '( )', title: 'Скобки по высоте', before: '\\left(', after: '\\right)', placeholder: '…' },
  { label: 'cases', title: 'Система', before: '\\begin{cases} ', after: ' \\end{cases}', placeholder: 'a, & x > 0 \\\\ b, & x \\le 0' },
]

/** Шпаргалка под редактором: синтаксис → что получится */
export const NOTEBOOK_HELP: [string, string][] = [
  ['## Заголовок · ### Подзаголовок', 'разделы заметки'],
  ['**жирный**', 'термин или ключевая мысль'],
  ['- пункт · 1. пункт', 'списки'],
  ['> текст', 'выделенный блок: определение, теорема'],
  ['| а | б | и строка |---|---|', 'таблица'],
  ['---', 'разделитель'],
  ['$x^2$', 'формула в строке'],
  ['$$ … $$ на своей строке', 'выключная формула'],
  ['\\frac{a}{b} · \\sqrt{x} · \\lim_{x\\to 0} · \\int_a^b · \\sum_{n=1}^{\\infty}', 'частые команды KaTeX'],
]
