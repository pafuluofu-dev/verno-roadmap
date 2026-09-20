import type { Track } from './data'

/** Встроенные треки — A и B; всё остальное — свои треки владельца */
export const isBuiltinTrack = (id: string): boolean => id === 'A' || id === 'B'

/** Буква цветовой схемы: у своих треков один общий третий цвет */
export function trackLetter(id: string): 'a' | 'b' | 'c' {
  if (id === 'A') return 'a'
  if (id === 'B') return 'b'
  return 'c'
}

/** Модификатор для классов вида progress-bar__fill--track-a */
export const trackModifier = (id: string): 'track-a' | 'track-b' | 'track-c' => `track-${trackLetter(id)}`

export const trackColor = (id: string): string => `var(--color-track-${trackLetter(id)})`

/** Имя своего трека для навигации и подписей шкалы — длинное не влезает в строку меню */
export function shortName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name
}

/** Подпись трека: встроенные — «Трек A», свои — по имени */
export const trackLabel = (track: Track): string => (isBuiltinTrack(track.id) ? `Трек ${track.id}` : shortName(track.name))

/** Короткая подпись в подсказках и легендах: буква у встроенных, имя у своих */
export const trackShortLabel = (track: Track): string => (isBuiltinTrack(track.id) ? track.id : shortName(track.name))
