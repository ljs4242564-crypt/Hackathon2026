import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { resolveAnswer } from '../services/answerResolver'
import { analyzeQuestion } from '../services/questionAnalyzer'
import { normalizeQuestion } from '../utils/textNormalizer'
import {
  CHAT_QUESTION_MAX_LENGTH,
  CHAT_QUESTION_MIN_LENGTH,
  type ApiErrorCode,
  type ApiErrorResponse,
  type ChatRequest,
  type ChatSuccessResponse,
} from '../shared/api'

const MAX_REQUEST_BYTES = 4_096

type ChatRouteDependencies = {
  resolver?: typeof resolveAnswer
}

function createRequestMeta() {
  return {
    requestId: crypto.randomUUID(),
    processedAt: new Date().toISOString(),
  }
}

function errorResponse(code: ApiErrorCode, message: string): ApiErrorResponse {
  return {
    ok: false,
    error: { code, message },
    meta: createRequestMeta(),
  }
}

export function createChatRoute(dependencies: ChatRouteDependencies = {}) {
  const route = new Hono()
  const resolver = dependencies.resolver ?? resolveAnswer

  route.post(
    '/chat',
    bodyLimit({
      maxSize: MAX_REQUEST_BYTES,
      onError: (c) => c.json(errorResponse('PAYLOAD_TOO_LARGE', '요청 데이터가 너무 큽니다.'), 413),
    }),
    async (c) => {
  const startedAt = Date.now()
  const requestMeta = createRequestMeta()
  const contentType = c.req.header('content-type') ?? ''
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase()
  if (mediaType !== 'application/json') {
    return c.json(
      errorResponse('INVALID_CONTENT_TYPE', 'Content-Type은 application/json이어야 합니다.'),
      415,
    )
  }

  const declaredLength = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return c.json(errorResponse('PAYLOAD_TOO_LARGE', '요청 데이터가 너무 큽니다.'), 413)
  }

  let rawBody: string
  try {
    rawBody = await c.req.text()
  } catch {
    return c.json(errorResponse('INVALID_JSON', '요청 내용을 읽을 수 없습니다.'), 400)
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return c.json(errorResponse('PAYLOAD_TOO_LARGE', '요청 데이터가 너무 큽니다.'), 413)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return c.json(errorResponse('INVALID_JSON', '올바른 JSON 형식으로 요청해 주세요.'), 400)
  }

  if (!body || typeof body !== 'object' || typeof (body as Partial<ChatRequest>).question !== 'string') {
    return c.json(errorResponse('INVALID_QUESTION', 'question 문자열이 필요합니다.'), 400)
  }

  const question = normalizeQuestion((body as ChatRequest).question)

  if (question.length < CHAT_QUESTION_MIN_LENGTH) {
    return c.json(
      errorResponse('QUESTION_TOO_SHORT', `질문은 ${CHAT_QUESTION_MIN_LENGTH}자 이상 입력해 주세요.`),
      400,
    )
  }

  if (question.length > CHAT_QUESTION_MAX_LENGTH) {
    return c.json(
      errorResponse('QUESTION_TOO_LONG', `질문은 ${CHAT_QUESTION_MAX_LENGTH}자 이하로 입력해 주세요.`),
      400,
    )
  }

  const analysis = analyzeQuestion(question)
  const resolved = await resolver(analysis, {
    context: { requestId: requestMeta.requestId },
  })

  const response: ChatSuccessResponse = {
    ok: true,
    status: resolved.status,
    question,
    analysis,
    search: resolved.search,
    answer: {
      title: resolved.title,
      content: resolved.content,
      fields: resolved.fields,
    },
    sources: resolved.sources,
    meta: {
      ...requestMeta,
      answerMode: resolved.answerMode,
      durationMs: Date.now() - startedAt,
      upstreamStatus: resolved.upstreamStatus,
      cacheHit: resolved.cacheHit,
      lastSuccessfulCheck: resolved.lastSuccessfulCheck,
    },
  }

  console.log('Chat request resolved', {
    requestId: requestMeta.requestId,
    durationMs: response.meta.durationMs,
    upstreamStatus: response.meta.upstreamStatus,
    cacheHit: response.meta.cacheHit,
    status: response.status,
  })

    return c.json(response, 200)
    },
  )

  return route
}

export const chatRoute = createChatRoute()
