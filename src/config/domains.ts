export type OfficialHostPolicy = {
  hostname: string
  allowedPaths: RegExp[]
}

export const OFFICIAL_HOST_POLICIES: OfficialHostPolicy[] = [
  {
    hostname: 'www.scnu.ac.kr',
    allowedPaths: [
      /^\/SCNU\/na\/ntt\/selectNtt(?:List|Info)\.do$/,
      /^\/SCNU\/og\/organiz\/selectOrganizList\.do$/,
      /^\/haksa\/cm\/cntnts\/cntntsView\.do$/,
      /^\/haksa\/sv\/schdulView\/(?:schdulCalendarView|selectSvList)\.do$/,
    ],
  },
  {
    hostname: 'library.scnu.ac.kr',
    allowedPaths: [/^\/$/, /^\/guide\//],
  },
]

export const URL_SECURITY_LIMITS = {
  maxRedirects: 2,
  timeoutMs: 6_000,
  maxResponseCharacters: 750_000,
} as const
