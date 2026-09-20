import { useEffect, useState } from 'react'
import type { BuiltinTrackId, Track } from './data'

/** Страницы «мимо плана» — по одной на встроенный трек */
export type SkippedRoute = 'skippedA' | 'skippedB'
export type StaticRoute = 'home' | BuiltinTrackId | SkippedRoute | 'notebook' | 'tree'
/** Страница своего трека: track:<id> */
export type TrackRoute = `track:${string}`
export type Route = StaticRoute | TrackRoute

export const ROUTE_META: Record<StaticRoute, { hash: string; title: string }> = {
  home: { hash: '#/', title: 'Маршрут verno/dev' },
  A: { hash: '#/track-a', title: 'Трек A — фриланс · Маршрут verno/dev' },
  B: { hash: '#/track-b', title: 'Трек B — fullstack · Маршрут verno/dev' },
  skippedA: { hash: '#/skipped-a', title: 'Мимо плана — фриланс · Маршрут verno/dev' },
  skippedB: { hash: '#/skipped-b', title: 'Мимо плана — fullstack · Маршрут verno/dev' },
  notebook: { hash: '#/notebook', title: 'Заметки — Маршрут verno/dev' },
  tree: { hash: '#/tree', title: 'Дерево — Маршрут verno/dev' },
}

export const skippedRouteOf = (track: BuiltinTrackId): SkippedRoute => (track === 'A' ? 'skippedA' : 'skippedB')

const TRACK_HASH_PREFIX = '#/track/'
const TRACK_ROUTE_PREFIX = 'track:'

const isBuiltin = (id: string): id is BuiltinTrackId => id === 'A' || id === 'B'
const isStaticRoute = (route: Route): route is StaticRoute => route in ROUTE_META

/** Адрес страницы трека: встроенные — как раньше, свои — #/track/<id> */
export const trackHash = (id: string): string => (isBuiltin(id) ? ROUTE_META[id].hash : `${TRACK_HASH_PREFIX}${id}`)

export const trackRouteOf = (id: string): Route => (isBuiltin(id) ? id : `${TRACK_ROUTE_PREFIX}${id}`)

/** id трека, если маршрут — страница трека, иначе null */
export function trackIdOf(route: Route): string | null {
  if (isBuiltin(route)) return route
  return route.startsWith(TRACK_ROUTE_PREFIX) ? route.slice(TRACK_ROUTE_PREFIX.length) : null
}

/** Адрес и заголовок вкладки; неизвестный свой трек (удалён или ссылка с другого устройства) ведёт на обзор */
export function routeMeta(route: Route, tracks: Track[]): { hash: string; title: string } {
  if (isStaticRoute(route)) return ROUTE_META[route]
  const id = route.slice(TRACK_ROUTE_PREFIX.length)
  const track = tracks.find((candidate) => candidate.id === id)
  return track ? { hash: trackHash(id), title: `${track.name} · Маршрут verno/dev` } : ROUTE_META.home
}

function parseHash(hash: string): Route {
  if (hash.startsWith(ROUTE_META.notebook.hash)) return 'notebook'
  if (hash.startsWith(ROUTE_META.tree.hash)) return 'tree'
  if (hash.startsWith(ROUTE_META.skippedA.hash)) return 'skippedA'
  if (hash.startsWith(ROUTE_META.skippedB.hash)) return 'skippedB'
  if (hash.startsWith(TRACK_HASH_PREFIX)) return `${TRACK_ROUTE_PREFIX}${hash.slice(TRACK_HASH_PREFIX.length)}`
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
