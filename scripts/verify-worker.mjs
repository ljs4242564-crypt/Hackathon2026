import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import worker from '../dist/_worker.js'

const results = []
const RealDate = Date
const realFetch = globalThis.fetch
const fixedClock = (instant) => {
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [instant])) }
    static now() { return new RealDate(instant).getTime() }
  }
}
const call = (path, init) => worker.fetch(new Request(`https://local.test${path}`, init), {})
const chat = async (question) => {
  const response = await call('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) })
  assert.equal(response.status, 200)
  return response.json()
}
const record = (name, data = {}) => { results.push({ name, status: 'passed', ...data }); console.log('PASS', name, data) }
const html = (text) => new Response(text, { headers: { 'Content-Type': 'text/html' } })
const board = (titles) => `<table>${titles.map((title, i) => `<tr><td>1</td><td class="ta_l"><a href="/SCNU/na/ntt/selectNttInfo.do?nttSn=${i+1}">${title}</a></td><td>학생지원과</td><td>2026.09.20</td></tr>`).join('')}</table>`
try {
  for (const path of ['/', '/api/health']) {
    const response = await call(path)
    assert.equal(response.status, 200)
    for (const header of ['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','permissions-policy']) assert.ok(response.headers.get(header), header)
    if (path === '/api/health') {
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.ok(response.headers.get('content-type').includes('application/json'))
      const health = await response.json()
      const next = await (await call(path)).json()
      assert.equal(health.appVersion, JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version)
      assert.equal(health.builtAt, next.builtAt)
      assert.ok(Number.isFinite(Date.parse(health.builtAt)))
      assert.equal(health.releaseId, 'local-development')
      assert.equal(health.commitSha, 'local-development')
      record('health metadata', health)
    }
    record(`${path}: status and security headers`)
  }
  fixedClock('2026-09-26T00:00:00Z')
  globalThis.fetch = async () => new Response('fixture upstream error', { status: 502 })
  const fallback = await chat('이번 학기 중간고사 언제야?')
  assert.equal(fallback.status, 'verified_snapshot')
  record('502 -> verified snapshot')
  for (const [question, excluded] of [
    ['이번 학기 중간고사 말고 기말고사', /중간고사|중간시험/],
    ['국가장학금 말고 외부장학금', /국가장학금/],
    ['학생증 재발급이 아니라 처음 발급', /재발급/],
  ]) {
    const result = await chat(question)
    assert.equal(result.status, 'upstream_unavailable')
    assert.doesNotMatch(JSON.stringify({ answer: result.answer, sources: result.sources }), excluded)
    record(`excluded topic safe fallback: ${question}`)
  }
  for (const [kind, question, positive, excluded] of [
    ['academic', '이번 학기 중간고사 말고 기말고사', '기말시험', /중간고사|중간시험/],
    ['scholarship', '국가장학금 말고 외부장학금', '외부장학금', /국가장학금/],
    ['student', '학생증 재발급이 아니라 처음 발급', '최초 발급', /재발급/],
  ]) {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input))
      if (kind === 'academic') return new Response(JSON.stringify([
        { bgnde: '2026/10/19', schdulTitle: '제2학기 중간시험' },
        { bgnde: '2026/12/14', schdulTitle: '제2학기 기말시험' },
      ]))
      if (url.searchParams.has('searchValue')) return html(board(kind === 'scholarship'
        ? ['2026학년도 2학기 국가장학금 신청 안내', '2026학년도 2학기 외부장학금 신청 안내'] : ['학생증 최초 발급 및 재발급 안내']))
      return html(kind === 'scholarship'
        ? '<p>국가장학금 신청 기간은 2026.09.01부터 2026.09.09입니다.</p><p>외부장학금 신청 기간은 2026.10.01부터 2026.10.15입니다.</p>'
        : '<p>학생증 재발급 수수료는 3000원입니다.</p><p>학생증 최초 발급은 온라인 신청 후 학생지원과에서 수령합니다.</p>')
    }
    const result = await chat(question)
    assert.equal(result.status, 'verified_live')
    assert.ok(result.answer.content.includes(positive))
    assert.doesNotMatch(JSON.stringify({ answer: result.answer, sources: result.sources }), excluded)
    record(`successful mixed source: ${question}`)
  }
  fixedClock('2027-04-01T00:00:00Z')
  globalThis.fetch = async () => new Response('fixture upstream error', { status: 502 })
  for (const question of ['중간고사 언제야?', '국가장학금 신청 기간 알려줘', '2027학년도 1학기 중간고사 언제야?']) {
    const result = await chat(question)
    assert.equal(result.status, 'upstream_unavailable')
    assert.equal(result.meta.cacheHit, false)
    assert.deepEqual(result.sources, [])
    record(`future semester rejects old snapshot: ${question}`)
  }
} finally {
  globalThis.fetch = realFetch
  globalThis.Date = RealDate
  writeFileSync(new URL('../verification/worker-results.json', import.meta.url), JSON.stringify(results, null, 2))
}
console.log(`Worker assertions: ${results.length} groups passed`)
