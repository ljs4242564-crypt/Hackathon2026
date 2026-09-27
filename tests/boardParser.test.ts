import { describe, expect, it } from 'vitest'
import { parseScnuBoardList } from '../src/services/boardParser'

const fixture = `
<table>
  <tbody>
    <tr><th>번호</th><th>제목</th><th>작성자</th><th>등록일</th></tr>
    <tr>
      <td>1588</td>
      <td class="ta_l">
        <a href="/SCNU/na/ntt/selectNttInfo.do?nttSn=281320551&mi=1132&currPage=1&searchValue=%EC%A4%91%EA%B0%84%EA%B3%A0%EC%82%AC">
          2026학년도 2학기 중간고사 안내
        </a>
      </td>
      <td class="BD_listUser">교무학사과 학사지원팀</td>
      <td>2026.09.14</td>
      <td>385</td>
    </tr>
    <tr>
      <td>1587</td>
      <td class="ta_l"><a href="https://attacker.example/SCNU/na/ntt/selectNttInfo.do?nttSn=10">외부 링크</a></td>
      <td>알 수 없음</td><td>2026.09.13</td>
    </tr>
  </tbody>
</table>`

describe('parseScnuBoardList', () => {
  it('공식 상세 링크의 제목, 부서, 게시일을 추출한다', () => {
    const result = parseScnuBoardList(
      fixture,
      'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do?mi=1132',
      '학사 게시판',
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      title: '2026학년도 2학기 중간고사 안내',
      department: '교무학사과 학사지원팀',
      url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=281320551&mi=1132',
      publishedAt: '2026-09-14',
    })
  })

  it('비공식 호스트 링크를 결과에서 제거한다', () => {
    const result = parseScnuBoardList(
      fixture.replace('https://attacker.example', 'https://evil.scnu.ac.kr.attacker.example'),
      'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
      '학사 게시판',
    )

    expect(result.every((item) => new URL(item.url).hostname === 'www.scnu.ac.kr')).toBe(true)
  })
})
