import { useMemo, useState } from 'react'
import type { Track } from '../data'
import { toISO, type DoneMap, type Plan, type Settings, type SkippedMap } from '../schedule'
import { buildTree, pruneDone, type TreeNode } from '../tree'
import { treeToSvg } from '../treeSvg'

interface TreePageProps {
  plan: Plan
  /** Все треки — встроенные и свои: порядок веток в дереве */
  tracks: Track[]
  done: DoneMap
  skipped: SkippedMap
  settings: Settings
}

/** Символ маркера виден глазами, статус — экранному диктору */
const MARKER: Record<'done' | 'current' | 'muted', string> = { done: '✓', current: '◐', muted: '○' }
const STATUS_TEXT: Record<'done' | 'current' | 'muted', string> = { done: 'сделано', current: 'идёт сейчас', muted: 'вне расписания' }

function TreeRow({ node }: { node: TreeNode }) {
  const className = ['tree__row', node.status ? `tree__row--${node.status}` : '', node.branch ? `tree__row--branch-${node.branch}` : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={className}>
      <span className="tree__marker" aria-hidden="true">
        {node.status ? MARKER[node.status] : '●'}
      </span>
      {node.status && <span className="visually-hidden">{STATUS_TEXT[node.status]}: </span>}
      <span className="tree__label">{node.label}</span>
      {node.meta && <span className="tree__meta">{node.meta}</span>}
    </span>
  )
}

function TreeBranch({ node, open }: { node: TreeNode; open: boolean }) {
  if (!node.folder) {
    return (
      <li className="tree__item tree__item--leaf">
        <TreeRow node={node} />
      </li>
    )
  }

  return (
    <li className="tree__item">
      <details className="tree__folder" open={open}>
        <summary className="tree__summary">
          <TreeRow node={node} />
        </summary>
        <ul className="tree__list">
          {node.children.map((child) => (
            <TreeBranch key={child.id} node={child} open={open} />
          ))}
        </ul>
      </details>
    </li>
  )
}

/**
 * Весь план одной картой. Ничего не хранит: фильтр и свёрнутость — состояние страницы,
 * а файл SVG собирается из того же дерева, что и разметка.
 */
export function TreePage({ plan, tracks, done, skipped, settings }: TreePageProps) {
  const [hideDone, setHideDone] = useState(false)
  // seq перезапускает <details>: без него «Развернуть всё» не действует на ветки, свёрнутые руками
  const [folds, setFolds] = useState({ open: true, seq: 0 })
  // Счётчик в ключе: одинаковый текст подряд не перерисовывает role="status", и скринридер молчит со второго раза
  const [message, setMessage] = useState({ text: '', n: 0 })

  const full = useMemo(() => buildTree(plan, tracks, done, settings, skipped), [plan, tracks, done, settings, skipped])
  const root = useMemo(() => (hideDone ? pruneDone(full) : full), [full, hideDone])

  const download = () => {
    const blob = new Blob([treeToSvg(full, { hideDone })], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `verno-tree-${toISO(new Date())}.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setMessage((previous) => ({ text: 'Файл скачан', n: previous.n + 1 }))
  }

  return (
    <main className="tree-page">
      <header className="page-head">
        <p className="eyebrow">Дерево плана · строится из данных</p>
        <h1 className="page-head__title">Дерево</h1>
        <p className="page-head__lead">
          Весь план одной картой: треки, этапы и шаги с отметками. Свернуть ветку — щёлкнуть по заголовку. Кнопка ниже скачивает дерево файлом SVG — его можно
          распечатать или вставить в заметки.
        </p>
      </header>

      <div className="tree-tools">
        <button type="button" className="button" onClick={download}>
          Скачать SVG
        </button>
        <button type="button" className="button" onClick={() => setFolds((previous) => ({ open: !previous.open, seq: previous.seq + 1 }))}>
          {folds.open ? 'Свернуть всё' : 'Развернуть всё'}
        </button>
        <label className="tree-tools__toggle">
          <input type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} />
          Скрыть сделанное
        </label>
      </div>
      {message.text && (
        <p className="tree-tools__message" role="status" key={message.n}>
          {message.text}
        </p>
      )}

      <ul className="tree" key={folds.seq}>
        <TreeBranch node={root} open={folds.open} />
      </ul>
    </main>
  )
}
