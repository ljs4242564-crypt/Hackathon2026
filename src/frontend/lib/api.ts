import type { ChatRequest, ChatResponse, ChatSuccessResponse } from '../../shared/api'

export class CampusApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'CampusApiError'
  }
}

export async function submitCampusQuestion(question: string): Promise<ChatSuccessResponse> {
  const request: ChatRequest = { question }
  let response: Response

  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    })
  } catch {
    throw new CampusApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 'NETWORK_ERROR')
  }

  let data: ChatResponse
  try {
    data = (await response.json()) as ChatResponse
  } catch {
    throw new CampusApiError('서버 응답을 확인할 수 없습니다.', 'INVALID_RESPONSE')
  }

  if (!response.ok || !data.ok) {
    const message = data.ok ? '요청을 처리하지 못했습니다.' : data.error.message
    const code = data.ok ? 'REQUEST_FAILED' : data.error.code
    throw new CampusApiError(message, code)
  }

  return data
}
