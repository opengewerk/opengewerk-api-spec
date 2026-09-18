// Starts the fixture instance and runs the live suite against it.
//
// The live suite is written for a real instance and knows nothing about the
// fixture: it only reads OPENGEWERK_BASE_URL and the two tokens. That way the
// checks stay honest while there is no implementation to point them at.

import { spawn } from 'node:child_process'
import { startFixture, fullToken, scopelessToken } from './fixture-instance.mjs'

const fixture = await startFixture()

const suite = spawn(process.execPath, ['--test', 'conformance/live.test.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    OPENGEWERK_BASE_URL: fixture.baseUrl,
    OPENGEWERK_TOKEN: fullToken,
    OPENGEWERK_TOKEN_WITHOUT_SCOPES: scopelessToken,
  },
})

const code = await new Promise((resolve) => suite.on('exit', resolve))
await fixture.close()
process.exit(code ?? 1)
