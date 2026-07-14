import { useMemo, useState } from 'react'
import type { CurricularUnit } from '../data/courses/types'
import type { UnitRecord } from '../lib/unitRecord'
import {
  type GradedUnit,
  getMelhoriaStatus,
  type MelhoriaStatus,
  perPointImpact,
  recommendMelhorias,
  weightedAverage,
} from '../lib/gpa'

interface MelhoriasCardProps {
  units: CurricularUnit[]
  records: Record<string, UnitRecord>
  currentAcademicYear: string
  target: number
  hypotheses: Record<string, number | null>
  onChangeHypothesis: (code: string, grade: number | null) => void
}

interface GradedUnitInfo {
  code: string
  name: string
  ects: number
  grade: number
  status: MelhoriaStatus
}

function blockedReason(status: MelhoriaStatus): string {
  switch (status.kind) {
    case 'already-improved':
      return 'Bloqueada — já foste a melhoria nesta UC (só se pode uma vez na vida).'
    case 'outside-window':
      return `Bloqueada — feita em ${status.doneIn}, fora da janela de dois anos letivos.`
    case 'missing-academic-year':
      return 'Por definir — indica em que ano letivo fizeste esta UC na tabela acima.'
    default:
      return ''
  }
}

export function MelhoriasCard({
  units,
  records,
  currentAcademicYear,
  target,
  hypotheses,
  onChangeHypothesis,
}: MelhoriasCardProps) {
  const [showBlocked, setShowBlocked] = useState(false)

  const graded: GradedUnitInfo[] = useMemo(() => {
    function toInfo(u: CurricularUnit): GradedUnitInfo | null {
      const record = records[u.code]
      if (!record || record.grade === null) return null
      const status = getMelhoriaStatus(
        {
          code: u.code,
          ects: u.ects,
          grade: record.grade,
          academicYear: record.academicYear,
          alreadyImproved: record.alreadyImproved,
        },
        currentAcademicYear,
      )
      if (status.kind === 'failed') return null // repetir não é melhoria — fica fora desta lista
      return { code: u.code, name: u.name, ects: u.ects, grade: record.grade, status }
    }
    return units.map(toInfo).filter((u): u is GradedUnitInfo => u !== null)
  }, [units, records, currentAcademicYear])

  const approvedBaseline: GradedUnit[] = useMemo(
    () =>
      units
        .map((u) => ({ ects: u.ects, grade: records[u.code]?.grade ?? null }))
        .filter((u) => u.grade !== null && u.grade >= 10),
    [units, records],
  )
  const totalApprovedEcts = approvedBaseline.reduce((acc, u) => acc + u.ects, 0)

  const eligible = graded.filter((u) => u.status.kind === 'eligible')
  const blocked = graded.filter((u) => u.status.kind !== 'eligible')

  const projectedAverage = useMemo(() => {
    function toEffectiveGraded(u: CurricularUnit): GradedUnit | null {
      const record = records[u.code]
      if (!record || record.grade === null || record.grade < 10) return null
      const hypothesis = hypotheses[u.code]
      const effectiveGrade =
        hypothesis !== null && hypothesis !== undefined
          ? Math.max(record.grade, hypothesis)
          : record.grade
      return { ects: u.ects, grade: effectiveGrade }
    }
    const overridden = units.map(toEffectiveGraded).filter((u): u is GradedUnit => u !== null)
    return weightedAverage(overridden)
  }, [units, records, hypotheses])

  const recommendation = recommendMelhorias(
    approvedBaseline,
    eligible.map((u) => ({ code: u.code, ects: u.ects, grade: u.grade })),
    target,
  )

  const hasAnyHypothesis = Object.values(hypotheses).some((v) => v !== null && v !== undefined)

  return (
    <div className="space-y-5">
      {/* Parte 1 — o que podes melhorar */}
      {eligible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-400 dark:border-stone-600">
          Nenhuma UC elegível para melhoria neste momento.
        </p>
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-white/70 dark:border-primary-light/20 dark:bg-stone-800/50">
          <p className="border-b border-primary/20 px-4 py-2 text-xs font-medium uppercase tracking-wide text-stone-400 dark:border-primary-light/20">
            Elegíveis para melhoria
          </p>
          <ul className="divide-y divide-stone-100 dark:divide-stone-700">
            {eligible.map((u) => (
              <li key={u.code} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-stone-700 dark:text-stone-200">{u.name}</p>
                  <p className="text-xs text-stone-400">
                    {u.ects} ECTS · nota atual: {u.grade} · cada valor ganho = +
                    {perPointImpact(u.ects, totalApprovedEcts).toFixed(3)} na média
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                  achas que consegues:
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    step={1}
                    placeholder="—"
                    value={hypotheses[u.code] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        onChangeHypothesis(u.code, null)
                        return
                      }
                      const n = Number(raw)
                      onChangeHypothesis(u.code, Number.isNaN(n) ? null : n)
                    }}
                    className="w-16 rounded-lg border border-primary/20 bg-white px-2 py-1 text-right text-sm
                      outline-none focus:border-primary dark:border-primary-light/25 dark:bg-stone-900"
                  />
                </label>
              </li>
            ))}
          </ul>
          {hasAnyHypothesis && projectedAverage !== null && (
            <p className="border-t border-primary/20 px-4 py-2 text-sm dark:border-primary-light/20">
              Média projetada com essas notas:{' '}
              <span className="font-display font-semibold text-primary dark:text-primary-light">
                {projectedAverage.toFixed(2)}
              </span>
            </p>
          )}
        </div>
      )}

      {blocked.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowBlocked((v) => !v)}
            className="text-xs font-medium text-stone-500 underline decoration-dotted dark:text-stone-400"
          >
            {showBlocked ? 'Esconder' : 'Ver'} bloqueadas ({blocked.length})
          </button>
          {showBlocked && (
            <ul className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white/50 dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-900/30">
              {blocked.map((u) => (
                <li key={u.code} className="px-4 py-2">
                  <p className="text-sm text-stone-600 dark:text-stone-300">{u.name}</p>
                  <p className="text-xs text-stone-400">{blockedReason(u.status)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Parte 2 — recomendação */}
      {eligible.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-white/70 p-4 dark:border-primary-light/20 dark:bg-stone-800/50">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
            Recomendação — por prioridade (ECTS × margem até 20)
          </p>
          <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-stone-700 dark:text-stone-200">
            {recommendation.ordered.map((u) => {
              const info = eligible.find((e) => e.code === u.code)!
              return (
                <li key={u.code}>
                  {info.name}{' '}
                  <span className="text-xs text-stone-400">
                    ({u.ects} ECTS, atual {u.grade})
                  </span>
                </li>
              )
            })}
          </ol>
          <div
            className={`rounded-xl p-3 text-sm ${recommendation.possible ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}
          >
            {recommendation.minimalSet === null && !recommendation.possible && (
              <>
                Mesmo melhorando todas para 20, não chegas a {target} — o máximo possível é{' '}
                {recommendation.achievedAverage?.toFixed(2)}.
              </>
            )}
            {recommendation.minimalSet !== null && recommendation.minimalSet.length === 0 && (
              <>Já estás a {recommendation.achievedAverage?.toFixed(2)}, acima do alvo de {target}.</>
            )}
            {recommendation.minimalSet !== null && recommendation.minimalSet.length > 0 && (
              <>
                Melhorando estas {recommendation.minimalSet.length} UC
                {recommendation.minimalSet.length > 1 ? 's' : ''} para 20 (por ordem de prioridade)
                já chegas a {target}: atinges{' '}
                {recommendation.achievedAverage?.toFixed(2)}.
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
