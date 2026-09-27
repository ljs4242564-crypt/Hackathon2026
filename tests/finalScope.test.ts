import { describe, it, expect } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { resolveAnswer } from '../src/services/answerResolver'
const now = new Date('2026-09-27T05:00:00Z')
const html = (text: string) => new Response(text, {headers:{'Content-Type':'text/html'}})
function fixture(title: string, body: string): typeof fetch {
 return async input => new URL(String(input)).pathname.endsWith('selectNttList.do')
  ? html(`<table><tr><td>1</td><td class="ta_l"><a href="/SCNU/na/ntt/selectNttInfo.do?nttSn=123">${title}</a></td><td>학생지원과</td><td>2026.09.20</td></tr></table>`)
  : html(`<main>${body}</main>`)
}
const output = (r: Awaited<ReturnType<typeof resolveAnswer>>) => JSON.stringify({title:r.title,content:r.content,fields:r.fields,sources:r.sources})
describe('final submission scope regressions', () => {
 it.each([
 ['S1','도서관 평일 운영시간 알려줘', /주말 시설|201·202/],
 ['S2','도서관 주말 운영시간 말고 평일 운영시간 알려줘',/주말 시설|201·202/],
 ['S3','2026학년도 2학기 국가장학금 1차 신청 기간 알려줘',/2차|2026.08.12/],
 ['S4','국가장학금과 주거안정장학금 신청 기간',/2차|2026.08.12/],
 ])('%s rejects wrong snapshot',async (_id,q,bad) => {
 const r=await resolveAnswer(analyzeQuestion(q,now),{fetcher:async()=>new Response('',{status:502}),now:()=>now})
 expect(r.answerMode).toBe('unavailable');expect(r.sources).toEqual([]);expect(output(r)).not.toMatch(bad)
 })
 it.each([
 ['L1','2025학년도 1학기 국가장학금 신청 기간 알려줘','2026학년도 2학기 국가장학금 신청 안내','<p>2026학년도 2학기 국가장학금 신청기간은 2026.08.12 ~ 2026.09.09입니다.</p>',/2026|08.12/],
 ['L2','학생증 처음 발급받는 방법 알려줘','학생증 재발급 안내','<p>학생증 재발급은 학생지원과 방문 후 3000원을 납부합니다.</p>',/재발급|3000/],
 ['L3','도서관 주말 운영시간 알려줘','도서관 안내','<p>도서관 평일 운영시간은 09:00 ~ 18:00입니다.</p>',/평일|09:00|18:00/],
 ])('%s rejects wrong HTTP 200 evidence',async (_id,q,title,body,bad)=>{
 const r=await resolveAnswer(analyzeQuestion(q,now),{fetcher:fixture(title,body),now:()=>now})
 expect(r.status).not.toBe('verified_live');expect(output(r)).not.toMatch(bad)
 if(r.answerMode==='unavailable') expect(r.sources).toEqual([])
 expect(r.upstreamStatus).toBe('ok')
 })
 it.each([
 ['도서관 평일 운영시간 알려줘','도서관 안내','도서관 평일 운영시간은 09:00 ~ 18:00입니다.','09:00'],
 ['도서관 주말 운영시간 알려줘','도서관 안내','도서관 주말 운영시간은 10:00 ~ 16:00입니다.','10:00'],
 ['학생증 처음 발급받는 방법 알려줘','학생증 최초 발급 안내','학생증 최초 발급은 온라인 신청 후 학생지원과에서 수령합니다.','최초 발급'],
 ['학생증 재발급 방법 알려줘','학생증 재발급 안내','학생증 재발급은 학생지원과 방문 후 신청합니다.','재발급'],
 ...[1,2].map(n=>[`2026학년도 2학기 국가장학금 ${n}차 신청 기간 알려줘`,`2026학년도 2학기 국가장학금 ${n}차 신청 안내`,`2026학년도 2학기 국가장학금 ${n}차 신청기간은 2026.08.12 ~ 2026.09.09입니다.`,`${n}차`]),
 ['2025학년도 1학기 국가장학금 신청 기간 알려줘','2025학년도 1학기 국가장학금 신청 안내','2025학년도 1학기 국가장학금 신청기간은 2025.02.01 ~ 2025.02.28입니다.','2025'],
 ])('accepts exact live evidence: %s',async(q,title,body,expected)=>{
 const r=await resolveAnswer(analyzeQuestion(q,now),{fetcher:fixture(title,`<p>${body}</p>`),now:()=>now})
 expect(r.status).toBe('verified_live');expect(r.content).toContain(expected);expect(r.sources).toHaveLength(1)
 })
 it('separates weekend exclusion from weekday evidence on same page',async()=>{
 const r=await resolveAnswer(analyzeQuestion('도서관 주말 운영시간 말고 평일 운영시간 알려줘',now),{fetcher:fixture('도서관 이용 안내','<p>도서관 주말 운영시간은 10:00 ~ 16:00입니다. 도서관 평일 운영시간은 09:00 ~ 18:00입니다.</p>'),now:()=>now})
 expect(r.status).toBe('verified_live');expect(output(r)).not.toMatch(/주말|10:00|16:00/);expect(r.content).toContain('평일')
 })
})

describe('applicability and calendar boundaries', () => {
 it('rejects scholarship body with only publication year and no applicable term',async()=>{
  const r=await resolveAnswer(analyzeQuestion('국가장학금 신청 기간 알려줘',now),{fetcher:fixture('국가장학금 신청 안내','<p>국가장학금 신청기간은 2026.08.12 ~ 2026.09.09입니다.</p>'),now:()=>now})
  expect(r.status).toBe('not_found');expect(r.upstreamStatus).toBe('ok');expect(r.sources).toEqual([])
 })
 it('matches January event to previous academic year',async()=>{
  const r=await resolveAnswer(analyzeQuestion('2026학년도 2학기 기말고사 언제야?',now),{fetcher:async()=>new Response(JSON.stringify([{bgnde:'2027/01/04',endde:'2027/01/08',schdulTitle:'제2학기 기말시험'}])),now:()=>now})
  expect(r.status).toBe('verified_live');expect(JSON.stringify(r.fields)).toContain('2027.01.04')
 })
 it.each([1,2])('chooses requested round %s among competing notices',async round=>{
  const titles=[1,2].map(n=>`2026학년도 2학기 국가장학금 ${n}차 신청 안내`)
  const fetcher:typeof fetch=async input=>{
   const u=new URL(String(input))
   if(u.pathname.endsWith('selectNttList.do')) return html(`<table>${titles.map((t,i)=>`<tr><td>1</td><td class="ta_l"><a href="/SCNU/na/ntt/selectNttInfo.do?nttSn=${i+1}">${t}</a></td><td>학생지원과</td><td>2026.09.20</td></tr>`).join('')}</table>`)
   return html(`<p>${titles[Number(u.searchParams.get('nttSn'))-1]} 신청기간은 2026.08.12 ~ 2026.09.09입니다.</p>`)
  }
  const r=await resolveAnswer(analyzeQuestion(`2026학년도 2학기 국가장학금 ${round}차 신청 기간 알려줘`,now),{fetcher,now:()=>now})
  expect(r.status).toBe('verified_live');expect(r.sources[0].url).toContain(`nttSn=${round}`);expect(output(r)).not.toContain(`${round===1?2:1}차`)
 })
})
