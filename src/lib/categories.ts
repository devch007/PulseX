import type { Category } from '../types'

/** Hues taken from a CVD-validated categorical palette, in fixed order. */
export const CATEGORY_PALETTE = [
  '#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#eda100', '#6250d6', '#008300', '#e34948',
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Work', color: '#2a78d6', builtIn: true },
  { id: 'clients', name: 'Clients', color: '#eb6834', builtIn: true },
  { id: 'finance', name: 'Finance', color: '#1baf7a', builtIn: true },
  { id: 'personal', name: 'Personal', color: '#e87ba4', builtIn: true },
  { id: 'admin', name: 'Admin', color: '#eda100', builtIn: true },
]

export const PRIORITY_META = {
  high: { label: 'High', color: '#d03b3b', bg: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', dot: 'bg-red-500' },
  medium: { label: 'Medium', color: '#d98b00', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300', dot: 'bg-amber-500' },
  low: { label: 'Low', color: '#0ca30c', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
} as const

export const STATUS_META = {
  todo: { label: 'To Do', short: 'To do' },
  inprogress: { label: 'In Progress', short: 'In progress' },
  done: { label: 'Done', short: 'Done' },
} as const
