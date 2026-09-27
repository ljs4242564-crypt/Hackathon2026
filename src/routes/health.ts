import { Hono } from 'hono'
import type { HealthResponse } from '../shared/api'
import { buildMetadata } from '../config/buildMetadata'

export const healthRoute = new Hono()

healthRoute.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'SCNU Campus Assistant API',
    ...buildMetadata,
    timestamp: new Date().toISOString(),
  }
  return c.json(response)
})
