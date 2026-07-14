import { describe, expect, it } from 'vitest'
import { courses, getCourse } from './index'

describe('courses', () => {
  it('loads at least the two seed courses', () => {
    const ids = courses.map((c) => c.id)
    expect(ids).toContain('l-eic')
    expect(ids).toContain('l-ec')
  })

  it('has unique course ids', () => {
    const ids = courses.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sums to 180 ECTS for the seed licenciaturas', () => {
    for (const id of ['l-eic', 'l-ec']) {
      const course = getCourse(id)
      expect(course).toBeDefined()
      const total = course!.units.reduce((acc, u) => acc + u.ects, 0)
      expect(total).toBeCloseTo(180, 6)
    }
  })

  it('getCourse returns undefined for an unknown id', () => {
    expect(getCourse('does-not-exist')).toBeUndefined()
  })
})
