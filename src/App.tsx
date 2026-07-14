import { useMemo } from 'react'
import { courses, getCourse } from './data/courses'
import { CourseSelector } from './components/CourseSelector'
import { UnitsTable } from './components/UnitsTable'
import { StatCard } from './components/StatCard'
import { Simulator } from './components/Simulator'
import { ImprovementCard } from './components/ImprovementCard'
import { ThemeToggle } from './components/ThemeToggle'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { completedEcts, type GradedUnit, roundCourseAverage, weightedAverage } from './lib/gpa'

interface CourseState {
  grades: Record<string, number | null>
  target: number
  simFixed: Record<string, number | null>
  currentYear: number | null
  improved: Record<string, boolean>
}

const emptyCourseState: CourseState = {
  grades: {},
  target: 14,
  simFixed: {},
  currentYear: null,
  improved: {},
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const [lastCourseId, setLastCourseId] = useLocalStorage<string | null>(
    'feup-media:last-course',
    null,
  )
  const selectedCourse = lastCourseId ? (getCourse(lastCourseId) ?? null) : null

  const [rawState, setRawState] = useLocalStorage<CourseState>(
    `feup-media:course:${selectedCourse?.id ?? 'none'}`,
    emptyCourseState,
  )
  // Funde sempre com os valores por omissão: estado antigo em localStorage
  // (de antes de um campo novo ser adicionado ao schema) não pode rebentar o app.
  const state: CourseState = { ...emptyCourseState, ...rawState }
  function setState(updater: (s: CourseState) => CourseState) {
    setRawState(() => updater(state))
  }

  const gradedUnits: GradedUnit[] = useMemo(
    () =>
      selectedCourse?.units.map((u) => ({ ects: u.ects, grade: state.grades[u.code] ?? null })) ??
      [],
    [selectedCourse, state.grades],
  )

  const average = weightedAverage(gradedUnits)
  const ects = completedEcts(gradedUnits)
  const countGraded = gradedUnits.filter((u) => u.grade !== null).length

  const remainingUnits = useMemo(
    () =>
      selectedCourse?.units.filter((u) => {
        const grade = state.grades[u.code] ?? null
        // Não aprovada ainda (sem nota, ou reprovada e por repetir) conta como "por resolver".
        return grade === null || grade < 10
      }) ?? [],
    [selectedCourse, state.grades],
  )

  const maxYear = useMemo(
    () => (selectedCourse ? Math.max(...selectedCourse.units.map((u) => u.year)) : 1),
    [selectedCourse],
  )

  const unitsForImprovement = useMemo(
    () =>
      selectedCourse?.units.map((u) => ({
        code: u.code,
        name: u.name,
        ects: u.ects,
        year: u.year,
        grade: state.grades[u.code] ?? null,
      })) ?? [],
    [selectedCourse, state.grades],
  )

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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary-light">
            Curso
          </h2>
          <CourseSelector
            courses={courses}
            selected={selectedCourse}
            onSelect={(course) => setLastCourseId(course.id)}
          />
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
                grades={state.grades}
                onChangeGrade={(code, grade) =>
                  setState((s) => ({ ...s, grades: { ...s.grades, [code]: grade } }))
                }
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
                UCs a melhorar
              </h2>
              <ImprovementCard
                units={unitsForImprovement}
                maxYear={maxYear}
                currentYear={state.currentYear}
                onChangeYear={(currentYear) => setState((s) => ({ ...s, currentYear }))}
                improved={state.improved}
                onToggleImproved={(code, value) =>
                  setState((s) => ({ ...s, improved: { ...s.improved, [code]: value } }))
                }
              />
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
