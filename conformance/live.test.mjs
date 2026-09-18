// Checks that need a running instance. They are skipped unless both
// OPENGEWERK_BASE_URL and OPENGEWERK_TOKEN are set, so CI stays green while no
// implementation exists yet.
//
// Run against a real instance:
//   OPENGEWERK_BASE_URL=https://betrieb.example/api/kanzlei/v1 \
//   OPENGEWERK_TOKEN=<token with every read scope> \
//   npm run test:live
//
// The suite never writes to locked data. It only creates records it can
// recognise again, and it marks them through the Idempotency-Key.

import test from 'node:test'
import assert from 'node:assert/strict'
import { operations, validator, validate } from './contract.mjs'

const baseUrl = process.env.OPENGEWERK_BASE_URL
const token = process.env.OPENGEWERK_TOKEN
const scopelessToken = process.env.OPENGEWERK_TOKEN_WITHOUT_SCOPES

const skip = baseUrl && token
  ? false
  : 'set OPENGEWERK_BASE_URL and OPENGEWERK_TOKEN to run the live suite'

const ajv = validator()

/** One request against the instance under test. */
async function call(path, { method = 'GET', headers = {}, body, bearer = token } = {}) {
  const response = await fetch(new URL(baseUrl + path), {
    method,
    headers: {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : undefined
  } catch {
    payload = undefined
  }
  return { status: response.status, headers: response.headers, payload, text }
}

/** Query parameters the contract marks as required, filled with usable values. */
function requiredQuery(operation) {
  const today = new Date().toISOString().slice(0, 10)
  const startOfYear = `${today.slice(0, 4)}-01-01`
  const values = { from: startOfYear, to: today, as_of: today }
  const params = (operation.parameters ?? [])
    .map((p) => p.$ref?.split('/').pop())
    .filter(Boolean)
  const query = new URLSearchParams()
  for (const name of params) {
    if (name === 'Von') query.set('from', values.from)
    if (name === 'Bis') query.set('to', values.to)
    if (name === 'Stichtag') query.set('as_of', values.as_of)
  }
  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

test('every GET endpoint of the contract exists', { skip }, async () => {
  for (const { path, method, operation } of operations()) {
    if (method !== 'get' || path.includes('{')) continue
    const { status } = await call(path + requiredQuery(operation))
    assert.notEqual(status, 404, `GET ${path} answers 404, the endpoint is missing`)
    assert.ok(status < 500, `GET ${path} answers ${status}`)
  }
})

test('a request without a token is answered with 401', { skip }, async () => {
  const { status } = await call('/periods', { bearer: undefined })
  assert.equal(status, 401)
})

test('a missing scope is answered with 403 and names the scope', { skip: skip || (scopelessToken ? false : 'set OPENGEWERK_TOKEN_WITHOUT_SCOPES') }, async () => {
  const { status, payload } = await call('/journal', { bearer: scopelessToken })
  assert.equal(status, 403, 'a missing scope must not be answered with 404')
  assert.ok(payload?.scope, 'the error object must name the missing scope')
})

test('list responses match their schema', { skip }, async () => {
  const listEndpoints = [
    ['/periods', 'periode.schema.json'],
    ['/journal', 'journalzeile.schema.json'],
    ['/accounts', 'konto.schema.json'],
    ['/balances', 'saldo.schema.json'],
    ['/open-items', 'offener-posten.schema.json'],
    ['/access-log', 'protokolleintrag.schema.json'],
  ]
  for (const [path, schemaFile] of listEndpoints) {
    const operation = operations().find((o) => o.path === path && o.method === 'get').operation
    const { status, payload } = await call(path + requiredQuery(operation))
    assert.equal(status, 200, `GET ${path} answers ${status}`)
    assert.ok(Array.isArray(payload?.items), `GET ${path} returns no items array`)
    for (const item of payload.items.slice(0, 20)) {
      const { valid, errors } = validate(ajv, schemaFile, item)
      assert.ok(valid, `GET ${path}: ${errors.join(', ')}`)
    }
  }
})

test('an unchanged state is answered with 304', { skip }, async () => {
  const operation = operations().find((o) => o.path === '/accounts').operation
  const first = await call('/accounts' + requiredQuery(operation))
  const etag = first.headers.get('etag')
  assert.ok(etag, 'GET /accounts sends no ETag')
  const second = await call('/accounts' + requiredQuery(operation), {
    headers: { 'If-None-Match': etag },
  })
  assert.equal(second.status, 304)
})

test('the same Idempotency-Key does not create a second record', { skip }, async () => {
  const key = `conformance-${Date.now()}`
  const body = {
    subject: 'Conformance test',
    body: 'Created by the conformance suite, no answer needed.',
    reference: { type: 'period', id: 'conformance' },
  }
  const first = await call('/inquiries', { method: 'POST', body, headers: { 'Idempotency-Key': key } })
  if (first.status === 403) {
    assert.fail('the token lacks write:comments, the idempotency check cannot run')
  }
  assert.equal(first.status, 201)
  const second = await call('/inquiries', { method: 'POST', body, headers: { 'Idempotency-Key': key } })
  assert.ok([200, 201].includes(second.status), `repeat answers ${second.status}`)
  assert.equal(second.payload?.id, first.payload?.id, 'the repeat created a second record')
})

test('every call shows up in the access log', { skip }, async () => {
  const marker = `/accounts?probe=${Date.now()}`
  await call(marker)
  const { payload } = await call('/access-log')
  const found = (payload?.items ?? []).some((entry) => entry.path?.includes('probe='))
  assert.ok(found, 'the probing call is missing from the access log')
})

// Not covered yet: version negotiation. The concept asks both sides to declare
// which contract version they support, but the contract does not say how, so
// there is nothing to test against. See conformance/README.md.
