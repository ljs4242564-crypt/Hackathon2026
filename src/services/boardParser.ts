import { DomUtils, ElementType, parseDocument } from 'htmlparser2'
import type { AnyNode, Element } from 'domhandler'

export type ParsedBoardItem = {
  title: string
  department: string | null
  url: string
  publishedAt: string | null
}

function isElement(node: AnyNode): node is Element {
  return node.type === ElementType.Tag
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function isAllowedDetailUrl(url: URL, expectedHostname: string) {
  return url.protocol === 'https:'
    && url.hostname === expectedHostname
    && url.port === ''
    && url.pathname === '/SCNU/na/ntt/selectNttInfo.do'
    && /^\d+$/.test(url.searchParams.get('nttSn') ?? '')
}

export function parseScnuBoardList(
  html: string,
  baseUrl: string,
  sourceName: string,
): ParsedBoardItem[] {
  const document = parseDocument(html, { decodeEntities: true })
  const base = new URL(baseUrl)
  const rows = DomUtils.findAll(
    (node) => isElement(node) && node.name === 'tr',
    document.children,
  )
  const seenUrls = new Set<string>()
  const items: ParsedBoardItem[] = []

  for (const row of rows) {
    const cells = row.children.filter(
      (node): node is Element => isElement(node) && node.name === 'td',
    )
    if (cells.length < 4) continue

    const titleCell = cells.find((cell) => cell.attribs.class?.split(/\s+/).includes('ta_l'))
    if (!titleCell) continue

    const link = DomUtils.findOne(
      (node) => isElement(node)
        && node.name === 'a'
        && (node.attribs.href ?? '').includes('selectNttInfo.do'),
      titleCell.children,
    )
    if (!link || !isElement(link)) continue

    let detailUrl: URL
    try {
      detailUrl = new URL(link.attribs.href, base)
    } catch {
      continue
    }

    if (!isAllowedDetailUrl(detailUrl, base.hostname)) continue

    detailUrl.searchParams.delete('searchValue')
    detailUrl.searchParams.delete('searchType')
    detailUrl.searchParams.delete('listCo')
    detailUrl.searchParams.delete('currPage')
    detailUrl.searchParams.delete('nttSttus')
    const canonicalUrl = detailUrl.toString()
    if (seenUrls.has(canonicalUrl)) continue

    const title = cleanText(DomUtils.textContent(link))
    if (!title) continue

    const titleIndex = cells.indexOf(titleCell)
    const departmentText = cleanText(DomUtils.textContent(cells[titleIndex + 1] ?? titleCell))
    const dateText = cleanText(DomUtils.textContent(cells[titleIndex + 2] ?? titleCell))
    const publishedAt = dateText.match(/20\d{2}[.-]\d{1,2}[.-]\d{1,2}/)?.[0]?.replaceAll('.', '-') ?? null

    seenUrls.add(canonicalUrl)
    items.push({
      title,
      department: departmentText || sourceName,
      url: canonicalUrl,
      publishedAt,
    })
  }

  return items
}
