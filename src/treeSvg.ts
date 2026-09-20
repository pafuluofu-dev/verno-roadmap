import { pruneDone, type TreeNode } from './tree'

/** Вёрстка детерминированная: одинаковое дерево даёт байт в байт одинаковый файл */
const ROW_HEIGHT = 26
const INDENT = 26
const WIDTH = 960
const MARGIN = 24
const MARKER_RADIUS = 4
const LABEL_LIMIT = 90

/**
 * Цвета зашиты числами, а не токенами: файл уезжает из браузера — в печать и в заметки,
 * где переменных темы нет. Взяты из светлой темы variables.css.
 */
const COLORS = {
  background: '#fbfcf8',
  text: '#1b1f18',
  muted: '#58614f',
  line: '#cdd5c2',
  done: '#2f6b0a',
  doneText: '#777777',
  a: '#3d7d12',
  b: '#4a4a46',
  c: '#1f6fb2',
}

const FONT = '-apple-system, Segoe UI, Roboto, sans-serif'

interface Row {
  node: TreeNode
  depth: number
  /** Индекс строки родителя; у корня — null */
  parent: number | null
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Длинные названия курсов рвут вёрстку — режем по букве, многоточие дорисовываем сами */
function clamp(label: string): string {
  return label.length > LABEL_LIMIT ? `${label.slice(0, LABEL_LIMIT - 1).trimEnd()}…` : label
}

function flatten(node: TreeNode, depth: number, parent: number | null, rows: Row[]): void {
  const index = rows.length
  rows.push({ node, depth, parent })
  for (const child of node.children) flatten(child, depth + 1, index, rows)
}

const markerX = (depth: number): number => MARGIN + depth * INDENT + MARKER_RADIUS + 2
const rowY = (index: number): number => MARGIN + index * ROW_HEIGHT + ROW_HEIGHT / 2

function branchColor(node: TreeNode): string {
  if (node.status === 'done') return COLORS.done
  return node.branch ? COLORS[node.branch] : COLORS.muted
}

/** Папка — ромб, шаг — круг; сделанное залито цветом успеха, отдых и «по желанию» — пустым контуром */
function marker(node: TreeNode, x: number, y: number): string {
  const color = branchColor(node)
  const hollow = node.status === 'muted'
  const fill = hollow ? COLORS.background : color
  if (node.folder) {
    const r = MARKER_RADIUS + 1
    const points = `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`
    return `<polygon points="${points}" fill="${fill}" stroke="${color}" stroke-width="1.5" />`
  }
  return `<circle cx="${x}" cy="${y}" r="${MARKER_RADIUS}" fill="${fill}" stroke="${color}" stroke-width="1.5" />`
}

function textColor(node: TreeNode): string {
  if (node.status === 'done') return COLORS.doneText
  if (node.status === 'muted') return COLORS.muted
  return COLORS.text
}

/** Одно дерево — одна печатная картинка: обход в глубину, строка на узел, уровень отступом */
export function treeToSvg(root: TreeNode, options?: { hideDone?: boolean }): string {
  const source = options?.hideDone ? pruneDone(root) : root
  const rows: Row[] = []
  flatten(source, 0, null, rows)

  const height = MARGIN * 2 + rows.length * ROW_HEIGHT
  const parts: string[] = []
  parts.push('<?xml version="1.0" encoding="UTF-8"?>')
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" font-family="${escapeXml(FONT)}">`,
  )
  parts.push(`<title>${escapeXml(source.label)}</title>`)
  parts.push(`<rect x="0" y="0" width="${WIDTH}" height="${height}" fill="${COLORS.background}" />`)

  rows.forEach((row, index) => {
    const x = markerX(row.depth)
    const y = rowY(index)
    if (row.parent !== null) {
      const parentX = markerX(rows[row.parent].depth)
      const parentY = rowY(row.parent)
      // сначала вертикаль по колонке родителя, потом горизонталь к маркеру — как рисуют деревья файлов
      parts.push(`<path d="M ${parentX} ${parentY + MARKER_RADIUS + 2} V ${y} H ${x - MARKER_RADIUS - 3}" fill="none" stroke="${COLORS.line}" />`)
    }
    parts.push(marker(row.node, x, y))

    const weight = row.node.folder ? ' font-weight="600"' : ''
    const label = escapeXml(clamp(row.node.label))
    const meta = row.node.meta ? `<tspan fill="${COLORS.muted}" font-size="11"> · ${escapeXml(row.node.meta)}</tspan>` : ''
    parts.push(`<text x="${x + MARKER_RADIUS + 8}" y="${y + 4}" font-size="13" fill="${textColor(row.node)}"${weight}>${label}${meta}</text>`)
  })

  parts.push('</svg>')
  return parts.join('\n')
}
