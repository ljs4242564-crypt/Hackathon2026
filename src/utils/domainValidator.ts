import { OFFICIAL_HOST_POLICIES, URL_SECURITY_LIMITS } from '../config/domains'
import type { RequestContext } from '../types/pipeline'

export type UrlValidationResult =
  | { valid: true; url: URL }
  | { valid: false; reason: string }

const IP_LITERAL = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[0-9a-f:]+\]?$/i

export function validateOfficialUrl(rawUrl: string | URL): UrlValidationResult {
  let url: URL
  try {
    url = rawUrl instanceof URL ? new URL(rawUrl.toString()) : new URL(rawUrl)
  } catch {
    return { valid: false, reason: 'URL 형식이 올바르지 않습니다.' }
  }

  if (url.protocol !== 'https:') return { valid: false, reason: 'HTTPS 주소만 허용됩니다.' }
  if (url.username || url.password) return { valid: false, reason: '인증정보가 포함된 URL은 허용되지 않습니다.' }
  if (url.port) return { valid: false, reason: '비표준 포트는 허용되지 않습니다.' }

  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || IP_LITERAL.test(hostname)) {
    return { valid: false, reason: '내부 주소와 IP 주소는 허용되지 않습니다.' }
  }

  const policy = OFFICIAL_HOST_POLICIES.find((item) => item.hostname === hostname)
  if (!policy) return { valid: false, reason: '공식 호스트 Allowlist에 없는 주소입니다.' }
  if (!policy.allowedPaths.some((pattern) => pattern.test(url.pathname))) {
    return { valid: false, reason: '공식 사이트의 허용된 경로가 아닙니다.' }
  }

  url.hash = ''
  return { valid: true, url }
}

export async function readResponseText(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('공식 사이트 응답이 허용된 크기를 초과했습니다.')
  }

  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel('response size limit exceeded')
        throw new Error('공식 사이트 응답이 허용된 크기를 초과했습니다.')
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}

export async function safeFetchOfficial(
  rawUrl: string | URL,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
  context?: RequestContext,
): Promise<{ response: Response; finalUrl: URL; redirectCount: number }> {
  let validation = validateOfficialUrl(rawUrl)
  if (!validation.valid) throw new Error(validation.reason)

  let currentUrl = validation.url
  const controller = new AbortController()
  const parentSignal = init.signal
  const abortFromParent = () => controller.abort(parentSignal?.reason)
  if (parentSignal?.aborted) abortFromParent()
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true })
  const timeout = setTimeout(() => controller.abort('official fetch timeout'), URL_SECURITY_LIMITS.timeoutMs)
  const startedAt = Date.now()
  let redirectCount = 0

  try {
    for (redirectCount = 0; redirectCount <= URL_SECURITY_LIMITS.maxRedirects; redirectCount += 1) {
      const response = await fetcher(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      })

      if (response.status < 300 || response.status >= 400) {
        console.info('Official upstream request completed', {
          requestId: context?.requestId ?? 'untracked',
          sourceId: context?.sourceId ?? 'unknown',
          durationMs: Date.now() - startedAt,
          httpStatus: response.status,
          redirectCount,
        })
        return { response, finalUrl: currentUrl, redirectCount }
      }

      const location = response.headers.get('location')
      if (!location) throw new Error('이동할 주소가 없는 redirect 응답입니다.')
      if (redirectCount === URL_SECURITY_LIMITS.maxRedirects) {
        throw new Error('허용된 redirect 횟수를 초과했습니다.')
      }

      validation = validateOfficialUrl(new URL(location, currentUrl))
      if (!validation.valid) throw new Error(`안전하지 않은 redirect: ${validation.reason}`)
      currentUrl = validation.url
    }
  } catch (error) {
    console.warn('Official upstream request failed', {
      requestId: context?.requestId ?? 'untracked',
      sourceId: context?.sourceId ?? 'unknown',
      durationMs: Date.now() - startedAt,
      httpStatus: null,
      redirectCount,
      errorCode: error instanceof Error ? error.name : 'UNKNOWN',
    })
    throw error
  } finally {
    clearTimeout(timeout)
    parentSignal?.removeEventListener('abort', abortFromParent)
  }

  throw new Error('공식 페이지 요청을 완료하지 못했습니다.')
}
