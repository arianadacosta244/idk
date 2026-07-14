export interface CurricularUnit {
  code: string
  name: string
  ects: number
  year: number
  semester: number
}

export interface Course {
  id: string
  name: string
  shortName: string
  units: CurricularUnit[]
}
