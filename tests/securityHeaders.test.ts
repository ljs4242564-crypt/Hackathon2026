import { describe, expect, it } from 'vitest'
import app from '../src/index'

describe('security headers', () => {
  it('HTML 응답에 브라우저 보안 헤더를 적용한다', async () => {
    const response = await app.request('/')
    const csp = response.headers.get('content-security-policy') ?? ''

    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000')
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  it('API 응답을 브라우저와 중간 캐시에 저장하지 않고 배포 식별자를 제공한다', async () => {
    const response = await app.request('/api/health')
    const body = await response.json() as Record<string, unknown>

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body).toMatchObject({
      status: 'ok',
      appVersion: '1.1.0',
      releaseId: 'local-development',
      commitSha: 'local-development',
      builtAt: 'local-development',
    })
    expect(body.timestamp).toEqual(expect.any(String))
  })
})
