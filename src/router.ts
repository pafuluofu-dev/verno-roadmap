import { useEffect, useState } from 'react'
import type { TrackId } from './data'

/** Страницы «мимо плана» — по одной на трек */
export type SkippedRoute = 'skippedA' | 'skippedB'
export type Route = 'home' | TrackId | SkippedRoute | 'notebook'

export const ROUTE_META: Record<Route, { hash: string; title: string }> = {
  home: { hash: '#/', title: 'Маршрут verno/dev' },
  A: { hash: '#/track-a', title: 'Трек A — фриланс · Маршрут verno/dev' },
  B: { hash: '#/track-b', title: 'Трек B — fullstack · Маршрут verno/dev' },
  skippedA: { hash: '#/skipped-a', title: 'Мимо плана — фриланс · Маршрут verno/dev' },
  skippedB: { hash: '#/skipped-b', title: 'Мимо плана — fullstack · Маршрут verno/dev' },
  notebook: { hash: '#/notebook', title: 'Заметки — Маршрут verno/dev' },
}

export const skippedRouteOf = (track: TrackId): SkippedRoute => (track === 'A' ? 'skippedA' : 'skippedB')

function parseHash(hash: string): Route {
  if (hash.startsWith(ROUTE_META.notebook.hash)) return 'notebook'
  if (hash.startsWith(ROUTE_META.skippedA.hash)) return 'skippedA'
  if (hash.startsWith(ROUTE_META.skippedB.hash)) return 'skippedB'
  if (hash.startsWith(ROUTE_META.A.hash)) return 'A'
  if (hash.startsWith(ROUTE_META.B.hash)) return 'B'
  return 'home'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}
