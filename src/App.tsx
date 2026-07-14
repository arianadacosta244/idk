import { useMemo } from 'react'
import { courses, getCourse } from './data/courses'
import { CourseSelector } from './components/CourseSelector'
import { UnitsTable } from './components/UnitsTable'
import { StatCard } from './components/StatCard'
import { Simulator } from './components/Simulator'
import { MelhoriasCard } from './components/MelhoriasCard'
import { ThemeToggle } from './components/ThemeToggle'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { completedEcts, type GradedUnit, roundCourseAverage, weightedAverage } from './lib/gpa'
import { currentAcademicYearGuess, isValidAcademicYear, recentAcademicYears } from './lib/academicYear'
import { emptyUnitRecord, type UnitRecord } from './lib/unitRecord'

interface CourseState {
  records: Record<string, UnitRecord>
  target: number
  simFixed: Record<string, number | null>
  melhoriaHypotheses: Record<string, number | null>
}

const emptyCourseState: CourseState = {
  records: {},
  target: 14,
  simFixed: {},
  melhoriaHypotheses: {},
}

/**
 * Estado antigo (antes do ano letivo real e do alreadyImproved vitalício)
 * guardava `grades`/`improved` separados. Migra para `records` sem perder as
 * notas já preenchidas — o aluno só precisa de voltar a indicar o ano letivo.
 */
function migrateCourseState(raw: unknown): CourseState {
  const r = (raw ?? {}) as Partial<CourseState> & {
    grades?: Record<string, number | null>
    improved?: Record<string, boolean>
  }

  if (r.records) {
    return { ...emptyCourseState, ...r, records: r.records }
  }

  const records: Record<string, UnitRecord> = {}
  if (r.grades) {
    for (const [code, grade] of Object.entries(r.grades)) {
      if (grade === null || grade === undefined) continue
      records[code] = {
        code,
        grade,
        academicYear: null,
        alreadyImproved: r.improved?.[code] ?? false,
      }
    }
  }
  return { ...emptyCourseState, ...r, records }
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const [lastCourseId, setLastCourseId] = useLocalStorage<string | null>(
    'feup-media:last-course',
    null,
  )
  const selectedCourse = lastCourseId ? (getCourse(lastCourseId) ?? null) : null

  const [currentAcademicYear, setCurrentAcademicYear] = useLocalStorage<string>(
    'feup-media:current-academic-year',
    currentAcademicYearGuess(),
  )

  const [rawState, setRawState] = useLocalStorage<unknown>(
    `feup-media:course:${selectedCourse?.id ?? 'none'}`,
    emptyCourseState,
  )
  const state = migrateCourseState(rawState)
  function setState(updater: (s: CourseState) => CourseState) {
    setRawState(() => updater(state))
  }

  function onChangeRecord(code: string, patch: Partial<UnitRecord>) {
    setState((s) => {
      const prev = s.records[code] ?? emptyUnitRecord(code)
      return { ...s, records: { ...s.records, [code]: { ...prev, ...patch } } }
    })
  }

  const gradedUnits: GradedUnit[] = useMemo(
    () =>
      selectedCourse?.units.map((u) => ({ ects: u.ects, grade: state.records[u.code]?.grade ?? null })) ??
      [],
    [selectedCourse, state.records],
  )

  const average = weightedAverage(gradedUnits)
  const ects = completedEcts(gradedUnits)
  const countGraded = gradedUnits.filter((u) => u.grade !== null).length

  const remainingUnits = useMemo(
    () =>
      selectedCourse?.units.filter((u) => {
        const grade = state.records[u.code]?.grade ?? null
        // Não aprovada ainda (sem nota, ou reprovada e por repetir) conta como "por resolver".
        return grade === null || grade < 10
      }) ?? [],
    [selectedCourse, state.records],
  )

  const academicYearOptions = recentAcademicYears(currentAcademicYearGuess(), 8)

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="mb-1 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Engenharia · FEUP
            </span>
            <h1 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
              🎓 Calculadora de Média FEUP
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Média ponderada por ECTS + simulador de cenários, por curso.
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <section className="mb-6 rounded-2xl border border-primary/20 border-t-4 border-t-primary bg-white/70 p-4 dark:border-primary-light/20 dark:border-t-primary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary-light">
                Curso
              </h2>
              <CourseSelector
                courses={courses}
                selected={selectedCourse}
                onSelect={(course) => setLastCourseId(course.id)}
              />
            </div>
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary-light">
                Ano letivo atual <span className="text-bad">*</span>
              </label>
              <select
                value={currentAcademicYear}
                onChange={(e) => setCurrentAcademicYear(e.target.value)}
                className="w-full rounded-xl border border-primary/20 bg-white px-3 py-2.5 text-sm text-stone-800
                  outline-none focus:border-primary dark:border-primary-light/20 dark:bg-stone-800 dark:text-stone-100"
              >
                {academicYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {!selectedCourse && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400 dark:border-stone-600">
            Escolhe um curso para carregar as UCs e começar.
          </p>
        )}

        {selectedCourse && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-primary/20 border-t-4 border-t-primary bg-white/70 p-4 dark:border-primary-light/20 dark:border-t-primary">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary-light">
                Unidades Curriculares — {selectedCourse.shortName}
              </h2>
              <UnitsTable
                units={selectedCourse.units}
                records={state.records}
                currentAcademicYear={currentAcademicYear || null}
                onChangeRecord={onChangeRecord}
              />
            </section>

            <section className="flex flex-wrap gap-3">
              <StatCard
                label="Média atual"
                value={average !== null ? average.toFixed(2) : '—'}
                accent
              />
              <StatCard
                label="Média arredondada"
                value={average !== null ? String(roundCourseAverage(average)) : '—'}
                sub="à unidade, se o curso acabasse hoje"
              />
              <StatCard label="ECTS concluídos" value={String(ects)} />
              <StatCard label="UCs com nota" value={String(countGraded)} />
            </section>

            <section className="rounded-2xl border border-primary/20 border-t-4 border-t-primary bg-white/70 p-4 dark:border-primary-light/20 dark:border-t-primary">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary-light">
                Melhorias
              </h2>
              {isValidAcademicYear(currentAcademicYear) ? (
                <MelhoriasCard
                  units={selectedCourse.units}
                  records={state.records}
                  currentAcademicYear={currentAcademicYear}
                  target={state.target}
                  hypotheses={state.melhoriaHypotheses}
                  onChangeHypothesis={(code, grade) =>
                    setState((s) => ({
                      ...s,
                      melhoriaHypotheses: { ...s.melhoriaHypotheses, [code]: grade },
                    }))
                  }
                />
              ) : (
                <p className="text-sm text-stone-400">
                  Define um ano letivo atual válido para veres as recomendações de melhoria.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-primary/20 border-t-4 border-t-primary bg-white/70 p-4 dark:border-primary-light/20 dark:border-t-primary">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary-light">
                Simulador de cenário
              </h2>
              <Simulator
                completed={gradedUnits}
                remainingUnits={remainingUnits}
                target={state.target}
                onChangeTarget={(target) => setState((s) => ({ ...s, target }))}
                fixedGrades={state.simFixed}
                onChangeFixed={(code, grade) =>
                  setState((s) => ({ ...s, simFixed: { ...s.simFixed, [code]: grade } }))
                }
              />
            </section>

            <footer className="pt-2 text-center text-xs text-stone-400">
              Os dados ficam guardados só no teu browser (localStorage), por curso.
            </footer>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
