import packageJson from '../../package.json'

type BuildMetadata = { appVersion: string; releaseId: string; commitSha: string; builtAt: string }
declare const __APP_BUILD_METADATA__: BuildMetadata

export const buildMetadata: BuildMetadata = typeof __APP_BUILD_METADATA__ === 'undefined'
  ? { appVersion: packageJson.version, releaseId: 'local-development', commitSha: 'local-development', builtAt: 'local-development' }
  : __APP_BUILD_METADATA__
