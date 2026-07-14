import type { Course } from './types'

function isCourse(value: unknown): value is Course {
  if (!value || typeof value !== 'object') return false
  const c = value as Partial<Course>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.shortName === 'string' &&
    Array.isArray(c.units)
  )
}

const modules = import.meta.glob<{ default: unknown }>('./*.json')

const loaded = await Promise.all(
  Object.entries(modules).map(async ([path, load]) => {
    try {
      const mod = await load()
      if (!isCourse(mod.default)) {
        console.warn(`[courses] a ignorar ${path}: ainda não tem o schema completo de Course`)
        return null
      }
      return mod.default
    } catch (err) {
      console.warn(`[courses] a ignorar ${path}: JSON inválido`, err)
      return null
    }
  }),
)

export const courses: Course[] = loaded
  .filter((c): c is Course => c !== null)
  .sort((a, b) => a.name.localeCompare(b.name, 'pt'))

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id)
}

export type { Course, CurricularUnit } from './types'
