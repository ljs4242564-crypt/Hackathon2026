import { Hono } from 'hono'
import { chatRoute } from './routes/chat'
import { healthRoute } from './routes/health'
import type { ApiErrorResponse } from './shared/api'

const app = new Hono()

app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Strict-Transport-Security', 'max-age=31536000')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'")
  if (c.req.path.startsWith('/api/')) c.header('Cache-Control', 'no-store')
})

app.route('/api', healthRoute)
app.route('/api', chatRoute)

app.all('/api/*', (c) => {
  const response: ApiErrorResponse = {
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: '요청한 API 경로를 찾을 수 없습니다.',
    },
    meta: {
      requestId: crypto.randomUUID(),
      processedAt: new Date().toISOString(),
    },
  }

  return c.json(response, 404)
})

app.onError((error, c) => {
  console.error('Unhandled API error', {
    errorCode: error.name || 'UNKNOWN',
    requestPath: c.req.path.startsWith('/api/') ? c.req.path : 'non-api',
  })

  if (c.req.path.startsWith('/api/')) {
    const response: ApiErrorResponse = {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      },
      meta: {
        requestId: crypto.randomUUID(),
        processedAt: new Date().toISOString(),
      },
    }

    return c.json(response, 500)
  }

  return c.text('Internal Server Error', 500)
})

app.get('*', (c) => {
  const clientScript = import.meta.env.PROD
    ? '<script type="module" src="/static/client.js"></script>'
    : '<script type="module" src="/src/frontend/main.tsx"></script>'
  const clientStyle = import.meta.env.PROD
    ? '<link rel="stylesheet" href="/static/client.css">'
    : ''

  return c.html(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#102a57">
    <meta name="description" content="국립순천대학교 공식 정보를 출처와 함께 안내하는 캠퍼스 생활 도우미">
    <title>SCNU Campus Assistant</title>
    ${clientStyle}
  </head>
  <body>
    <div id="root"></div>
    ${clientScript}
  </body>
</html>`)
})

export default app
