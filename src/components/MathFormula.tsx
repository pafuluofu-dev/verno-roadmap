import katex from 'katex'
import { useMemo } from 'react'

/** Рендер одной выключной формулы (LaTeX без $-обёртки) */
export function MathFormula({ tex }: { tex: string }) {
  const html = useMemo(() => renderTex(tex, true), [tex])
  return <div className="math-formula" dangerouslySetInnerHTML={{ __html: html }} />
}

interface MathTextProps {
  /** Текст с формулами: $...$ — инлайн, $$...$$ — выключная */
  text: string
  as?: 'p' | 'span' | 'div'
  className?: string
}

/** Смешанный текст с формулами. Годится и для заметок владельца: текст экранируется, KaTeX работает без trust —
    \href, \url и \includegraphics не выполняются, в разметку попадают только наши теги */
export function MathText({ text, as: Tag = 'span', className }: MathTextProps) {
  const html = useMemo(() => renderMixed(text), [text])
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function renderTex(tex: string, displayMode: boolean): string {
  try {
    // throwOnError: false — при ошибке KaTeX сам подсветит исходник красным, страница не упадёт
    return katex.renderToString(tex, { displayMode, throwOnError: false, strict: false })
  } catch {
    return `<code class="math-error" title="Формула не разобрана">${escapeHtml(tex)}</code>`
  }
}

// Сначала $$...$$, потом одиночные $...$ (без переносов строки, чтобы не съесть текст между двумя ценами)
const SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
// Жирный может обнимать формулу: «**Считаем $AB$**» — поэтому его режем раньше формул
const BOLD = /(\*\*[^*]+?\*\*)/g

function renderMixed(text: string): string {
  return text
    .split(BOLD)
    .map((part) =>
      part.length > 4 && part.startsWith('**') && part.endsWith('**') ? `<strong>${renderMath(part.slice(2, -2))}</strong>` : renderMath(part),
    )
    .join('')
}

/** Формулы через KaTeX, всё остальное экранируется — в разметку попадают только наши теги */
function renderMath(text: string): string {
  return text
    .split(SPLIT)
    .map((part) => {
      if (part.length > 4 && part.startsWith('$$') && part.endsWith('$$')) return renderTex(part.slice(2, -2), true)
      if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) return renderTex(part.slice(1, -1), false)
      return escapeHtml(part)
    })
    .join('')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
