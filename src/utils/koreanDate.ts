const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function koreanDateParts(now = new Date()) {
  const parts = formatter.formatToParts(now)
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day') }
}

export function koreanDate(now = new Date()) {
  const { year, month, day } = koreanDateParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function koreanAcademicTerm(now = new Date()) {
  const { year, month } = koreanDateParts(now)
  if (month >= 3 && month <= 8) return { year, semester: 1 as const }
  return { year: month < 3 ? year - 1 : year, semester: 2 as const }
}

// Stored verification dates are KST calendar dates, not UTC instants.
export function snapshotCheckDate(value: string) {
  return koreanDate(new Date(`${value}T00:00:00+09:00`))
}
