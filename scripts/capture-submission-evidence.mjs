// Node direct Worker call with an explicit upstream-502 fixture. Not a public test.
import worker from '../dist/_worker.js'
import {writeFileSync} from 'node:fs'
const originalFetch = globalThis.fetch
const rows=[]
try {
 globalThis.fetch=async()=>new Response('',{status:502})
 for(const question of ['이번 학기 중간고사 언제야?','국가장학금 신청 기간 알려줘.','도서관은 주말에도 운영해?','학생증 재발급 방법 알려줘.','학사 관련 문의 전화번호 알려줘.','도서관 평일 운영시간 알려줘','도서관 주말 운영시간 말고 평일 운영시간 알려줘','2026학년도 2학기 국가장학금 1차 신청 기간 알려줘','국가장학금과 주거안정장학금 신청 기간']){
 const response=await worker.fetch(new Request('https://local.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})}),{})
 const data=await response.json()
 rows.push({question,environment:'Node Worker direct call; upstream 502 fixture',http:response.status,contentType:response.headers.get('content-type'),status:data.status,answer:data.answer,sources:data.sources,meta:data.meta})
 }
 const health=await worker.fetch(new Request('https://local.test/api/health'),{})
 writeFileSync('verification/final-review/demo-results.json',JSON.stringify({environment:'local Node; not Cloudflare deployment',health:await health.json(),rows},null,2))
} finally { globalThis.fetch=originalFetch }
