import { describe, expect, it } from 'vitest'
import {
  completedEcts,
  getMelhoriaStatus,
  improvementPotential,
  isValidGrade,
  perPointImpact,
  recommendMelhorias,
  roundCourseAverage,
  simulateTarget,
  sortByImpact,
  weightedAverage,
} from './gpa'

describe('weightedAverage', () => {
  it('returns null when there are no graded units', () => {
    expect(weightedAverage([])).toBeNull()
    expect(weightedAverage([{ ects: 6, grade: null }])).toBeNull()
  })

  it('computes the ECTS-weighted average over graded units only', () => {
    const avg = weightedAverage([
      { ects: 6, grade: 14 },
      { ects: 6, grade: 16 },
      { ects: 6, grade: null },
    ])
    expect(avg).toBeCloseTo(15, 6)
  })

  it('weights unequal ECTS correctly', () => {
    const avg = weightedAverage([
      { ects: 6, grade: 10 },
      { ects: 3, grade: 20 },
    ])
    // (6*10 + 3*20) / 9 = 13.333...
    expect(avg).toBeCloseTo(13.3333, 3)
  })

  it('excludes failed units (grade below 10) from both numerator and denominator', () => {
    // Regression: a reprovação não pode arrastar a média para baixo nem contar ECTS.
    const avg = weightedAverage([
      { ects: 30, grade: 14 },
      { ects: 6, grade: 7 },
    ])
    expect(avg).toBeCloseTo(14, 6)
  })

  it('returns null when every graded unit is a failure', () => {
    expect(weightedAverage([{ ects: 6, grade: 8 }])).toBeNull()
  })
})

describe('completedEcts', () => {
  it('excludes ungraded units', () => {
    expect(completedEcts([{ ects: 6, grade: null }])).toBe(0)
  })

  it('excludes failed units (grade below 10)', () => {
    const ects = completedEcts([
      { ects: 6, grade: 9 },
      { ects: 5, grade: 10 },
    ])
    expect(ects).toBe(5)
  })

  it('sums ECTS of all passed units', () => {
    const ects = completedEcts([
      { ects: 6, grade: 14 },
      { ects: 4.5, grade: 20 },
      { ects: 6, grade: 8 },
    ])
    expect(ects).toBe(10.5)
  })
})

describe('roundCourseAverage', () => {
  it('rounds to the nearest integer', () => {
    expect(roundCourseAverage(13.4)).toBe(13)
    expect(roundCourseAverage(13.5)).toBe(14)
    expect(roundCourseAverage(13.49)).toBe(13)
  })
})

describe('isValidGrade', () => {
  it('accepts integers between 0 and 20', () => {
    expect(isValidGrade(0)).toBe(true)
    expect(isValidGrade(20)).toBe(true)
    expect(isValidGrade(14)).toBe(true)
  })

  it('rejects out-of-range or non-integer grades', () => {
    expect(isValidGrade(-1)).toBe(false)
    expect(isValidGrade(21)).toBe(false)
    expect(isValidGrade(14.5)).toBe(false)
  })
})

describe('sortByImpact', () => {
  it('orders units by ECTS descending without mutating the input', () => {
    const input = [{ ects: 6 }, { ects: 1.5 }, { ects: 4.5 }]
    const sorted = sortByImpact(input)
    expect(sorted.map((u) => u.ects)).toEqual([6, 4.5, 1.5])
    expect(input.map((u) => u.ects)).toEqual([6, 1.5, 4.5])
  })
})

describe('simulateTarget', () => {
  it('reports the exact required grade for a single remaining unit', () => {
    // completed: 30 ECTS at 14 => weighted 420. target 14, remaining LTW 6 ECTS.
    // total = 36, required*6 = 14*36 - 420 = 504-420=84 => required=14
    const result = simulateTarget({
      target: 14,
      completed: [{ ects: 30, grade: 14 }],
      remaining: [{ ects: 6 }],
    })
    expect(result.possible).toBe(true)
    expect(result.requiredGrade).toBeCloseTo(14, 6)
    expect(result.requiredGradeRounded).toBe(14)
  })

  it('rounds a fractional requirement up to the next integer grade', () => {
    // completed: 30 ECTS at 13 => weighted 390. target 14, remaining 6 ECTS.
    // total=36, required = (14*36 - 390)/6 = (504-390)/6 = 19
    const result = simulateTarget({
      target: 14,
      completed: [{ ects: 30, grade: 13 }],
      remaining: [{ ects: 6 }],
    })
    expect(result.requiredGrade).toBeCloseTo(19, 6)
    expect(result.requiredGradeRounded).toBe(19)
  })

  it('guarantees the target when required grade is at or below 0', () => {
    const result = simulateTarget({
      target: 10,
      completed: [{ ects: 30, grade: 18 }],
      remaining: [{ ects: 6 }],
    })
    expect(result.possible).toBe(true)
    expect(result.requiredGrade).toBe(0)
    expect(result.requiredGradeRounded).toBe(0)
  })

  it('flags the target as impossible when the required grade exceeds 20', () => {
    // completed: 30 ECTS at 10 (passed) => weighted 300. target 14, remaining 6 ECTS.
    // total=36, required=(14*36-300)/6=(504-300)/6=34 > 20
    const result = simulateTarget({
      target: 14,
      completed: [{ ects: 30, grade: 10 }],
      remaining: [{ ects: 6 }],
    })
    expect(result.possible).toBe(false)
    expect(result.requiredGrade).toBeCloseTo(34, 6)
    expect(result.requiredGradeRounded).toBeNull()
    expect(result.maxPossibleAverage).not.toBeNull()
    // best case: (300 + 20*6)/36 = 420/36 = 11.6666...
    expect(result.maxPossibleAverage).toBeCloseTo(11.6667, 3)
  })

  it('treats a failed completed unit as not contributing to the known baseline', () => {
    // A failing grade (< 10) must be excluded from both numerator and denominator,
    // exactly like weightedAverage — it doesn't count as "known" ECTS at all.
    const withFail = simulateTarget({
      target: 14,
      completed: [
        { ects: 30, grade: 14 },
        { ects: 6, grade: 7 },
      ],
      remaining: [{ ects: 6 }],
    })
    const withoutFail = simulateTarget({
      target: 14,
      completed: [{ ects: 30, grade: 14 }],
      remaining: [{ ects: 6 }],
    })
    expect(withFail.requiredGrade).toBeCloseTo(withoutFail.requiredGrade!, 6)
  })

  it('solves only for units without a fixed grade', () => {
    // completed: 24 ECTS at 15 => weighted 360.
    // remaining: fixed unit 6 ECTS @ 12 (weighted 72), unit to solve 6 ECTS.
    // total = 24+6+6=36. required*6 = 14*36 - 360 - 72 = 504-432=72 => required=12
    const result = simulateTarget({
      target: 14,
      completed: [{ ects: 24, grade: 15 }],
      remaining: [
        { ects: 6, fixedGrade: 12 },
        { ects: 6 },
      ],
    })
    expect(result.requiredGrade).toBeCloseTo(12, 6)
  })

  it('reports achieved average directly when everything remaining is fixed', () => {
    const result = simulateTarget({
      target: 14,
      completed: [{ ects: 30, grade: 14 }],
      remaining: [{ ects: 6, fixedGrade: 20 }],
    })
    expect(result.requiredGrade).toBeNull()
    expect(result.possible).toBe(true)
    // (30*14 + 6*20)/36 = (420+120)/36 = 15
    expect(result.maxPossibleAverage).toBeCloseTo(15, 6)
  })

  it('handles the degenerate case of zero total ECTS', () => {
    const result = simulateTarget({ target: 14, completed: [], remaining: [] })
    expect(result.possible).toBe(false)
    expect(result.requiredGrade).toBeNull()
  })
})

describe('getMelhoriaStatus', () => {
  const base = { code: 'A', ects: 6, academicYear: '2024/2025', alreadyImproved: false }

  it('is failed when there is no grade or the grade is below 10', () => {
    expect(getMelhoriaStatus({ ...base, grade: null }, '2025/2026')).toEqual({ kind: 'failed' })
    expect(getMelhoriaStatus({ ...base, grade: 9 }, '2025/2026')).toEqual({ kind: 'failed' })
  })

  it('is already-improved when the unit was already taken to melhoria, regardless of window', () => {
    expect(
      getMelhoriaStatus({ ...base, grade: 14, alreadyImproved: true }, '2025/2026'),
    ).toEqual({ kind: 'already-improved' })
  })

  it('is missing-academic-year when the unit has no recorded academic year', () => {
    expect(getMelhoriaStatus({ ...base, grade: 14, academicYear: null }, '2025/2026')).toEqual({
      kind: 'missing-academic-year',
    })
  })

  it('is eligible in the same academic year', () => {
    expect(getMelhoriaStatus({ ...base, grade: 14, academicYear: '2025/2026' }, '2025/2026')).toEqual(
      { kind: 'eligible' },
    )
  })

  it('is eligible in the immediately preceding academic year', () => {
    expect(getMelhoriaStatus({ ...base, grade: 14, academicYear: '2024/2025' }, '2025/2026')).toEqual(
      { kind: 'eligible' },
    )
  })

  it('is outside-window when done more than one academic year ago', () => {
    expect(
      getMelhoriaStatus({ ...base, grade: 14, academicYear: '2023/2024' }, '2025/2026'),
    ).toEqual({ kind: 'outside-window', doneIn: '2023/2024' })
  })
})

describe('perPointImpact', () => {
  it('is the ECTS share of the total approved ECTS', () => {
    expect(perPointImpact(6, 60)).toBeCloseTo(0.1, 6)
  })

  it('is 0 when there is no approved ECTS at all', () => {
    expect(perPointImpact(6, 0)).toBe(0)
  })
})

describe('improvementPotential', () => {
  it('is ECTS times the room left to reach 20', () => {
    expect(improvementPotential(6, 11)).toBe(54)
    expect(improvementPotential(1.5, 17)).toBe(4.5)
  })
})

describe('recommendMelhorias', () => {
  it('orders eligible units by improvement potential, highest first', () => {
    const result = recommendMelhorias(
      [{ ects: 60, grade: 12 }],
      [
        { code: 'small-margin', ects: 6, grade: 17 }, // 6*3=18
        { code: 'big-margin', ects: 6, grade: 11 }, // 6*9=54
      ],
      20, // unreachable target, just checking ordering
    )
    expect(result.ordered.map((u) => u.code)).toEqual(['big-margin', 'small-margin'])
  })

  it('returns an empty minimal set when the target is already met', () => {
    const result = recommendMelhorias([{ ects: 60, grade: 15 }], [], 14)
    expect(result.possible).toBe(true)
    expect(result.minimalSet).toEqual([])
  })

  it('finds the minimal prefix of eligible units that reaches the target', () => {
    // baseline: 60 ECTS at 12 => avg 12. target 13.
    // needs +60 weighted points. unit A (6 ECTS, grade 11) gives 6*9=54 alone -> avg (720+54)/60=12.9, not enough.
    // adding unit B (6 ECTS, grade 14) gives 6*6=36 more -> avg (720+54+36)/60=13.5 >= 13.
    const result = recommendMelhorias(
      [{ ects: 60, grade: 12 }],
      [
        { code: 'A', ects: 6, grade: 11 },
        { code: 'B', ects: 6, grade: 14 },
      ],
      13,
    )
    expect(result.possible).toBe(true)
    expect(result.minimalSet?.map((u) => u.code)).toEqual(['A', 'B'])
    expect(result.achievedAverage).toBeCloseTo(13.5, 6)
  })

  it('flags the target as unreachable even improving every eligible unit to 20', () => {
    // baseline includes A's real current grade (54 ECTS @ 10, plus A: 6 ECTS @ 15).
    const result = recommendMelhorias(
      [
        { ects: 54, grade: 10 },
        { ects: 6, grade: 15 },
      ],
      [{ code: 'A', ects: 6, grade: 15 }],
      18,
    )
    expect(result.possible).toBe(false)
    expect(result.minimalSet).toBeNull()
    // start: (540 + 90)/60 = 10.5. A -> 20 adds 6*5=30 => (630+30)/60 = 11.
    expect(result.achievedAverage).toBeCloseTo(11, 6)
  })

  it('handles no approved baseline at all', () => {
    const result = recommendMelhorias([], [{ code: 'A', ects: 6, grade: 15 }], 14)
    expect(result.possible).toBe(false)
    expect(result.achievedAverage).toBeNull()
  })
})
