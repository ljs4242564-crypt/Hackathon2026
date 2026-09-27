import { describe, expect, it, vi } from 'vitest'
import { readResponseText, safeFetchOfficial, validateOfficialUrl } from '../src/utils/domainValidator'

describe('validateOfficialUrl', () => {
  it.each([
    'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://library.scnu.ac.kr/',
    'https://www.scnu.ac.kr/haksa/sv/schdulView/selectSvList.do',
  ])('허용된 공식 URL을 통과시킨다: %s', (url) => {
    expect(validateOfficialUrl(url).valid).toBe(true)
  })

  it.each([
    'http://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://scnu.ac.kr.attacker.example/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://www.scnu.ac.kr:8443/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://user:pass@www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://127.0.0.1/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://localhost/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    'https://www.scnu.ac.kr/admin/private',
  ])('안전하지 않은 URL을 거부한다: %s', (url) => {
    expect(validateOfficialUrl(url).valid).toBe(false)
  })
})

describe('readResponseText', () => {
  it('Content-Length가 제한을 넘으면 본문을 읽기 전에 거부한다', async () => {
    const response = new Response('short', { headers: { 'Content-Length': '100' } })
    await expect(readResponseText(response, 10)).rejects.toThrow('허용된 크기')
  })

  it('스트리밍 본문이 제한을 넘으면 읽기를 중단한다', async () => {
    const response = new Response('가'.repeat(20))
    await expect(readResponseText(response, 10)).rejects.toThrow('허용된 크기')
  })
})

describe('safeFetchOfficial', () => {
  it('허용된 공식 redirect를 다시 검증해 따라간다', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: '/SCNU/na/ntt/selectNttInfo.do?nttSn=2' },
      }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 })) as typeof fetch

    const result = await safeFetchOfficial(
      'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
      {},
      fetcher,
    )

    expect(result.response.status).toBe(200)
    expect(result.finalUrl.searchParams.get('nttSn')).toBe('2')
  })

  it('비공식 호스트 redirect를 차단한다', async () => {
    const fetcher = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: 'https://attacker.example/private' },
    })) as typeof fetch

    await expect(safeFetchOfficial(
      'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
      {},
      fetcher,
    )).rejects.toThrow('안전하지 않은 redirect')
  })
})
