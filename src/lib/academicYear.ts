const ACADEMIC_YEAR_RE = /^(\d{4})\/(\d{4})$/

/** "2024/2025" -> 2024. null se o formato for inválido ou os anos não forem consecutivos. */
export function parseAcademicYearStart(value: string): number | null {
  const match = ACADEMIC_YEAR_RE.exec(value.trim())
  if (!match) return null
  const start = Number(match[1])
  const end = Number(match[2])
  return end === start + 1 ? start : null
}

export function isValidAcademicYear(value: string): boolean {
  return parseAcademicYearStart(value) !== null
}

/**
 * Quantos anos letivos `done` está antes de `current`. 0 = mesmo ano letivo,
 * 1 = ano letivo imediatamente anterior. Negativo = no futuro (não deveria
 * acontecer). null se algum dos dois for inválido.
 */
export function academicYearGap(current: string, done: string): number | null {
  const currentStart = parseAcademicYearStart(current)
  const doneStart = parseAcademicYearStart(done)
  if (currentStart === null || doneStart === null) return null
  return currentStart - doneStart
}

/** Lista de anos letivos recentes (o atual e os `count - 1` anteriores), mais recente primeiro. */
export function recentAcademicYears(current: string, count = 8): string[] {
  const start = parseAcademicYearStart(current)
  if (start === null) return [current]
  return Array.from({ length: count }, (_, i) => `${start - i}/${start - i + 1}`)
}
