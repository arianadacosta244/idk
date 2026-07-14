import { describe, expect, it } from 'vitest'
import {
  academicYearGap,
  isValidAcademicYear,
  parseAcademicYearStart,
  recentAcademicYears,
} from './academicYear'

describe('parseAcademicYearStart', () => {
  it('parses a valid "YYYY/YYYY" academic year', () => {
    expect(parseAcademicYearStart('2024/2025')).toBe(2024)
  })

  it('rejects non-consecutive years', () => {
    expect(parseAcademicYearStart('2024/2026')).toBeNull()
  })

  it('rejects malformed strings', () => {
    expect(parseAcademicYearStart('2024-2025')).toBeNull()
    expect(parseAcademicYearStart('24/25')).toBeNull()
    expect(parseAcademicYearStart('not a year')).toBeNull()
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseAcademicYearStart(' 2024/2025 ')).toBe(2024)
  })
})

describe('isValidAcademicYear', () => {
  it('mirrors parseAcademicYearStart validity', () => {
    expect(isValidAcademicYear('2024/2025')).toBe(true)
    expect(isValidAcademicYear('2024/2026')).toBe(false)
  })
})

describe('academicYearGap', () => {
  it('is 0 for the same academic year', () => {
    expect(academicYearGap('2025/2026', '2025/2026')).toBe(0)
  })

  it('is 1 for the immediately preceding year', () => {
    expect(academicYearGap('2025/2026', '2024/2025')).toBe(1)
  })

  it('is 2+ for older years', () => {
    expect(academicYearGap('2025/2026', '2023/2024')).toBe(2)
  })

  it('returns null when either year is invalid', () => {
    expect(academicYearGap('bad', '2024/2025')).toBeNull()
    expect(academicYearGap('2025/2026', 'bad')).toBeNull()
  })
})

describe('recentAcademicYears', () => {
  it('returns the current year first, then previous years descending', () => {
    expect(recentAcademicYears('2025/2026', 3)).toEqual(['2025/2026', '2024/2025', '2023/2024'])
  })

  it('falls back to just the given value when invalid', () => {
    expect(recentAcademicYears('bad', 3)).toEqual(['bad'])
  })
})
