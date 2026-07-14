import { academicYearGap } from './academicYear'

export interface GradedUnit {
  ects: number
  /** null = ainda não tem nota */
  grade: number | null
}

export interface RemainingUnit {
  ects: number
  /** nota hipotética fixada pelo utilizador para esta UC na simulação; null/undefined = por resolver */
  fixedGrade?: number | null
}

export interface SimulationInput {
  target: number
  completed: GradedUnit[]
  remaining: RemainingUnit[]
}

export interface SimulationResult {
  /** true se o alvo é atingível (mesmo que precise de 20 em tudo) */
  possible: boolean
  /** nota exata (real) necessária nas UCs por resolver, uniforme entre elas */
  requiredGrade: number | null
  /** nota inteira mínima (0-20) que garante o alvo, arredondada para cima */
  requiredGradeRounded: number | null
  /** melhor média possível, assumindo 20 em todas as UCs por resolver */
  maxPossibleAverage: number | null
  message: string
}

const PASS_GRADE = 10
const MIN_GRADE = 0
const MAX_GRADE = 20

export function isValidGrade(grade: number): boolean {
  return Number.isInteger(grade) && grade >= MIN_GRADE && grade <= MAX_GRADE
}

/**
 * Média ponderada por ECTS, só sobre UCs aprovadas (nota preenchida e >= 10).
 * Uma UC reprovada não conta nem para o numerador nem para o denominador —
 * tal como no SIGARRA, só ECTS realizados entram na média.
 */
export function weightedAverage(units: GradedUnit[]): number | null {
  const approved = units.filter(
    (u): u is GradedUnit & { grade: number } => u.grade !== null && u.grade >= PASS_GRADE,
  )
  const sumEcts = approved.reduce((acc, u) => acc + u.ects, 0)
  if (sumEcts === 0) return null
  const sumWeighted = approved.reduce((acc, u) => acc + u.ects * u.grade, 0)
  return sumWeighted / sumEcts
}

/** ECTS de UCs com nota preenchida e aprovada (>= 10). */
export function completedEcts(units: GradedUnit[]): number {
  return units
    .filter((u) => u.grade !== null && u.grade >= PASS_GRADE)
    .reduce((acc, u) => acc + u.ects, 0)
}

/** Arredonda a média final de curso à unidade (arredondamento padrão). */
export function roundCourseAverage(average: number): number {
  return Math.round(average)
}

/** Ordena UCs por impacto na média (mais ECTS primeiro). */
export function sortByImpact<T extends { ects: number }>(units: T[]): T[] {
  return [...units].sort((a, b) => b.ects - a.ects)
}

// --- Elegibilidade para melhoria de nota -----------------------------------
//
// Regras FEUP: uma UC só pode ir a melhoria se (1) está aprovada, (2) foi
// feita no ano letivo atual ou no imediatamente anterior, e (3) nunca foi a
// melhoria antes (é vitalício, não anual). Falhar qualquer uma bloqueia a UC,
// mas continua visível com o motivo — nunca escondida.

export type MelhoriaStatus =
  | { kind: 'eligible' }
  | { kind: 'failed' }
  | { kind: 'already-improved' }
  | { kind: 'outside-window'; doneIn: string }
  | { kind: 'missing-academic-year' }

export interface MelhoriaUnitInput {
  code: string
  ects: number
  grade: number | null
  /** "2024/2025"; null se o utilizador ainda não indicou quando fez a UC. */
  academicYear: string | null
  alreadyImproved: boolean
}

export function getMelhoriaStatus(
  unit: MelhoriaUnitInput,
  currentAcademicYear: string,
): MelhoriaStatus {
  if (unit.grade === null || unit.grade < PASS_GRADE) return { kind: 'failed' }
  if (unit.alreadyImproved) return { kind: 'already-improved' }
  if (!unit.academicYear) return { kind: 'missing-academic-year' }

  const gap = academicYearGap(currentAcademicYear, unit.academicYear)
  if (gap === null) return { kind: 'missing-academic-year' }
  if (gap < 0 || gap > 1) return { kind: 'outside-window', doneIn: unit.academicYear }
  return { kind: 'eligible' }
}

/** Quanto a média sobe por cada valor ganho nesta UC (proporcional ao peso em ECTS). */
export function perPointImpact(ects: number, totalApprovedEcts: number): number {
  return totalApprovedEcts > 0 ? ects / totalApprovedEcts : 0
}

/** Potencial total de subida se a UC chegar a 20 — critério de prioridade de melhoria. */
export function improvementPotential(ects: number, grade: number): number {
  return ects * (MAX_GRADE - grade)
}

export interface MelhoriaEligibleUnit {
  code: string
  ects: number
  grade: number
}

export interface MelhoriaRecommendation<T extends MelhoriaEligibleUnit> {
  /** Elegíveis ordenadas por potencial de melhoria (ects × (20 - nota)), do maior para o menor. */
  ordered: T[]
  /** Prefixo mínimo de `ordered` que atinge o alvo (assumindo 20 nessas UCs); [] se o alvo já está atingido; null se inatingível mesmo com 20 em todas. */
  minimalSet: T[] | null
  /** Média atingida com o `minimalSet` (ou o máximo possível, se inatingível). */
  achievedAverage: number | null
  possible: boolean
}

/**
 * Dado o conjunto de UCs aprovadas (para a média-base) e o subconjunto
 * elegível para melhoria, encontra a combinação mínima de melhorias — a
 * prioridades mais altas primeiro — que atinge a média-alvo, assumindo que
 * cada UC melhorada chega a 20.
 */
export function recommendMelhorias<T extends MelhoriaEligibleUnit>(
  approvedBaseline: GradedUnit[],
  eligible: T[],
  target: number,
): MelhoriaRecommendation<T> {
  const sumEcts = approvedBaseline.reduce((acc, u) => acc + u.ects, 0)
  const sumWeighted = approvedBaseline.reduce(
    (acc, u) => acc + u.ects * (u.grade ?? 0),
    0,
  )

  const ordered = [...eligible].sort(
    (a, b) => improvementPotential(b.ects, b.grade) - improvementPotential(a.ects, a.grade),
  )

  if (sumEcts === 0) {
    return { ordered, minimalSet: null, achievedAverage: null, possible: false }
  }

  const currentAverage = sumWeighted / sumEcts
  if (currentAverage >= target) {
    return { ordered, minimalSet: [], achievedAverage: roundAway(currentAverage), possible: true }
  }

  let cumulative = sumWeighted
  for (let i = 0; i < ordered.length; i++) {
    cumulative += improvementPotential(ordered[i].ects, ordered[i].grade)
    const avg = cumulative / sumEcts
    if (avg >= target) {
      return {
        ordered,
        minimalSet: ordered.slice(0, i + 1),
        achievedAverage: roundAway(avg),
        possible: true,
      }
    }
  }

  return {
    ordered,
    minimalSet: null,
    achievedAverage: roundAway(cumulative / sumEcts),
    possible: false,
  }
}

function roundAway(value: number, decimals = 6): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Resolve a nota uniforme mínima necessária nas UCs "por resolver" para atingir
 * a média-alvo, dadas as UCs já concluídas e UCs restantes com nota fixada.
 */
export function simulateTarget(input: SimulationInput): SimulationResult {
  const { target, completed, remaining } = input

  // Só UCs aprovadas (nota >= 10) entram no numerador/denominador — uma
  // reprovação não conta, tal como na média oficial do SIGARRA.
  const sumKnownEcts = completed.reduce(
    (acc, u) => acc + (u.grade !== null && u.grade >= PASS_GRADE ? u.ects : 0),
    0,
  )
  const sumKnownWeighted = completed.reduce(
    (acc, u) => acc + (u.grade !== null && u.grade >= PASS_GRADE ? u.ects * u.grade : 0),
    0,
  )

  const fixedRemaining = remaining.filter((u) => u.fixedGrade !== null && u.fixedGrade !== undefined)
  const toSolve = remaining.filter((u) => u.fixedGrade === null || u.fixedGrade === undefined)

  const sumFixedEcts = fixedRemaining.reduce((acc, u) => acc + u.ects, 0)
  const sumFixedWeighted = fixedRemaining.reduce((acc, u) => acc + u.ects * (u.fixedGrade as number), 0)
  const sumToSolveEcts = toSolve.reduce((acc, u) => acc + u.ects, 0)

  const totalEcts = sumKnownEcts + sumFixedEcts + sumToSolveEcts

  if (totalEcts === 0) {
    return {
      possible: false,
      requiredGrade: null,
      requiredGradeRounded: null,
      maxPossibleAverage: null,
      message: 'Não há ECTS suficientes para calcular.',
    }
  }

  if (sumToSolveEcts === 0) {
    const achieved = (sumKnownWeighted + sumFixedWeighted) / totalEcts
    const possible = achieved >= target
    return {
      possible,
      requiredGrade: null,
      requiredGradeRounded: null,
      maxPossibleAverage: roundAway(achieved),
      message: possible
        ? `Com as notas fixadas já atinges uma média de ${roundAway(achieved, 2).toFixed(2)}.`
        : `Com as notas fixadas a média fica em ${roundAway(achieved, 2).toFixed(2)}, abaixo do alvo de ${target}.`,
    }
  }

  const rawRequired = (target * totalEcts - sumKnownWeighted - sumFixedWeighted) / sumToSolveEcts
  const required = roundAway(rawRequired)

  if (required <= MIN_GRADE) {
    return {
      possible: true,
      requiredGrade: 0,
      requiredGradeRounded: 0,
      maxPossibleAverage: null,
      message: `Até com 0 valores nas UCs por resolver já atinges a média de ${target}. Objetivo garantido.`,
    }
  }

  if (required <= MAX_GRADE) {
    const requiredGradeRounded = Math.min(MAX_GRADE, Math.max(MIN_GRADE, Math.ceil(required - 1e-9)))
    return {
      possible: true,
      requiredGrade: required,
      requiredGradeRounded,
      maxPossibleAverage: null,
      message: `Precisas de pelo menos ${required.toFixed(2)} valores (mínimo inteiro: ${requiredGradeRounded}) nas UCs por resolver para atingir ${target}.`,
    }
  }

  const maxPossible = roundAway((sumKnownWeighted + sumFixedWeighted + MAX_GRADE * sumToSolveEcts) / totalEcts)
  return {
    possible: false,
    requiredGrade: required,
    requiredGradeRounded: null,
    maxPossibleAverage: maxPossible,
    message: `Não é possível atingir ${target} — precisarias de ${required.toFixed(2)} valores, acima do máximo (20). O melhor cenário possível dá uma média de ${maxPossible.toFixed(2)}.`,
  }
}
