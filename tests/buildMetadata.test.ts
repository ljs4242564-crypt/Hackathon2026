import { expect, it } from 'vitest'
import app from '../src/index'
import packageJson from '../package.json'

it('health uses package version and exposes only the metadata allowlist', async () => {
  const env = { API_KEY: 'fixture-secret', ACCOUNT_ID: 'fixture-account', APP_VERSION: 'unexpected-override' }
  const first = await app.request('/api/health', {}, env)
  const body = await first.json()
  const second = await (await app.request('/api/health')).json()
  expect(body.appVersion).toBe(packageJson.version)
  expect(body.builtAt).toBe(second.builtAt)
  expect(Object.keys(body).sort()).toEqual(['appVersion', 'builtAt', 'commitSha', 'releaseId', 'service', 'status', 'timestamp'].sort())
  expect(JSON.stringify(body)).not.toContain('fixture-secret')
  expect(JSON.stringify(body)).not.toContain('fixture-account')
  expect(first.headers.get('Cache-Control')).toBe('no-store')
})
