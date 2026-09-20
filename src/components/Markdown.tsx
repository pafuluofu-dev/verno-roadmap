import { Fragment, useMemo } from 'react'
import { MathFormula, MathText } from './MathFormula'

/* Разбор markdown-подмножества, на котором написаны конспекты (src/data/notes.ts):
   ## / ### заголовки, абзацы, - и 1. списки, > выделенные блоки, таблицы, --- и $$…$$.
   Полноценный markdown не нужен, а свой разбор избавляет от зависимости и держит вывод семантичным. */

type Block =
  | { kind: 'heading'; level: 3 | 4; text: string; topic?: number }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'math'; tex: string }
  | { kind: 'rule' }

const HEADING = /^(#{2,4})\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const NUMBERED = /^\d+[.)]\s+(.*)$/
const RULE = /^-{3,}$/
const TABLE_DIVIDER = /^\|[\s:|-]+\|$/
/** Заголовок вида «Тема 7. Векторное произведение» — из него берётся якорь note-topic-7 */
const TOPIC_HEADING = /^Тема\s+(\d+)[.:)]/i

/** Ячейки строки таблицы. Труба внутри $…$ (например $|\mathbf a|$) и экранированная \| — не разделители */
function splitCells(row: string): string[] {
  const inner = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  let inMath = false
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i]
    if (char === '\\' && inner[i + 1] === '|') {
      current += '|'
      i += 1
    } else if (char === '$') {
      inMath = !inMath
      current += char
    } else if (char === '|' && !inMath) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

/** Строка начинает новый блок — значит, абзац или пункт списка на ней обрывается */
function startsBlock(line: string): boolean {
  return HEADING.test(line) || BULLET.test(line) || NUMBERED.test(line) || RULE.test(line) || line.startsWith('>') || line.startsWith('|') || line.startsWith('$$')
}

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) {
      i += 1
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ kind: 'rule' })
      i += 1
      continue
    }

    // Выключная формула: либо целиком на строке, либо до строки с закрывающими $$
    if (line.startsWith('$$')) {
      let tex: string
      if (line.length > 3 && line.endsWith('$$')) {
        tex = line.slice(2, -2)
        i += 1
      } else {
        const parts = [line.slice(2)]
        i += 1
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          parts.push(lines[i])
          i += 1
        }
        if (i < lines.length) {
          parts.push(lines[i].trim().replace(/\$\$$/, ''))
          i += 1
        }
        tex = parts.join('\n')
      }
      blocks.push({ kind: 'math', tex: tex.trim() })
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      const text = heading[2].trim()
      const topic = text.match(TOPIC_HEADING)
      blocks.push({ kind: 'heading', level: heading[1].length === 2 ? 3 : 4, text, topic: topic ? Number(topic[1]) : undefined })
      i += 1
      continue
    }

    if (line.startsWith('>')) {
      const parts: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        parts.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push({ kind: 'quote', text: parts.join('\n') })
      continue
    }

    if (line.startsWith('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1].trim())) {
      const head = splitCells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitCells(lines[i]))
        i += 1
      }
      blocks.push({ kind: 'table', head, rows })
      continue
    }

    const bullet = line.match(BULLET)
    const numbered = line.match(NUMBERED)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      const items: string[] = [(ordered ? numbered : bullet)![1]]
      i += 1
      while (i < lines.length) {
        const next = lines[i].trim()
        const nextItem = next.match(ordered ? NUMBERED : BULLET)
        if (nextItem) {
          items.push(nextItem[1])
          i += 1
        } else if (next && !startsBlock(next)) {
          // перенос длинного пункта на следующую строку
          items[items.length - 1] += ` ${next}`
          i += 1
        } else {
          break
        }
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next || startsBlock(next)) break
      paragraph.push(next)
      i += 1
    }
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
  }

  return blocks
}

export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parse(text), [text])

  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`
        switch (block.kind) {
          case 'heading':
            return block.level === 3 ? (
              <h3 className="note__heading" id={block.topic ? `note-topic-${block.topic}` : undefined} key={key}>
                <MathText text={block.text} />
              </h3>
            ) : (
              <h4 className="note__subheading" key={key}>
                <MathText text={block.text} />
              </h4>
            )
          case 'paragraph':
            return <MathText as="p" className="note__paragraph" key={key} text={block.text} />
          case 'list':
            return block.ordered ? (
              <ol className="note__list note__list--ordered" key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <MathText text={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="note__list" key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <MathText text={item} />
                  </li>
                ))}
              </ul>
            )
          case 'quote':
            return (
              <blockquote className="note__callout" key={key}>
                <Markdown text={block.text} />
              </blockquote>
            )
          case 'table':
            return (
              <div className="note__table-scroll" key={key}>
                <table className="note__table">
                  <thead>
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th key={cellIndex} scope="col">
                          <MathText text={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>
                            <MathText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'math':
            return <MathFormula key={key} tex={block.tex} />
          case 'rule':
            return <hr className="note__rule" key={key} />
          default:
            return <Fragment key={key} />
        }
      })}
    </>
  )
}
