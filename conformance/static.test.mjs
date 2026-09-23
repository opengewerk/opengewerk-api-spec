// Checks that need no running instance. They keep the contract consistent with
// itself and with the documentation, and they run in CI on every push.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  contract, schemas, schemaFiles, operations, scopesOf, declaredScopes, validator, root,
} from './contract.mjs'

test('every schema is valid JSON Schema 2020-12', () => {
  const ajv = validator()
  for (const name of schemaFiles) {
    assert.ok(ajv.getSchema(name), `${name} does not compile`)
  }
  assert.equal(schemaFiles.length, 10, 'there should be ten payload schemas')
})

test('every schema carries $schema, $id, title and description', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', `${name}: wrong draft`)
    assert.ok(schema.$id?.startsWith('https://'), `${name}: $id missing or relative`)
    assert.ok(schema.$id.endsWith(name), `${name}: $id does not match the file name`)
    assert.ok(schema.title, `${name}: title missing`)
    assert.ok(schema.description, `${name}: description missing`)
  }
})

test('no schema accepts unknown fields', () => {
  const open = []
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'object' && node.properties && node.additionalProperties !== false) {
      open.push(path)
    }
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object') walk(value, `${path}/${key}`)
    }
  }
  for (const [name, schema] of Object.entries(schemas)) walk(schema, name)
  assert.deepEqual(open, [], 'these objects allow additional properties')
})

test('amounts are integer cents, floating point nowhere', () => {
  const offenders = []
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'number') offenders.push(`${path}: type number`)
    for (const [key, value] of Object.entries(node.properties ?? {})) {
      if (key.endsWith('_cents') && value.type !== 'integer') {
        offenders.push(`${path}/${key}: not an integer`)
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object') walk(value, `${path}/${key}`)
    }
  }
  for (const [name, schema] of Object.entries(schemas)) walk(schema, name)
  assert.deepEqual(offenders, [])
})

test('every timestamp is pinned to UTC, not merely to RFC 3339', () => {
  // `format: date-time` alone accepts 2026-09-19T08:00:00+02:00, while
  // x-conventions.dates says UTC. A validator that only knows the
  // format would let the offset through, and two sides would then disagree by
  // hours about when a document was issued.
  const utc = String.raw`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`
  const offenders = []
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return
    if (node.format === 'date-time' && node.pattern !== utc) {
      offenders.push(`${path}: ${node.pattern ? 'other pattern' : 'no pattern'}`)
    }
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object') walk(value, `${path}/${key}`)
    }
  }
  for (const [name, schema] of Object.entries(schemas)) walk(schema, name)
  assert.deepEqual(offenders, [], 'these timestamps accept any offset')
})

test('every schema is actually referenced by the OpenAPI file', () => {
  const text = readFileSync(join(root, 'openapi', 'opengewerk-kanzlei-api.yaml'), 'utf8')
  const unused = schemaFiles.filter((name) => !text.includes(`../schemas/${name}`))
  assert.deepEqual(unused, [], 'nothing references these schemas')
})

test('every operation only asks for declared scopes', () => {
  const known = declaredScopes()
  for (const { path, method, operation } of operations()) {
    for (const scope of scopesOf(operation)) {
      assert.ok(known.includes(scope), `${method.toUpperCase()} ${path}: ${scope} is declared nowhere`)
    }
  }
})

test('every operation answers missing authentication and missing scope', () => {
  for (const { path, method, operation } of operations()) {
    const codes = Object.keys(operation.responses)
    assert.ok(codes.includes('401'), `${method.toUpperCase()} ${path}: 401 missing`)
    if (scopesOf(operation).length > 0) {
      assert.ok(codes.includes('403'), `${method.toUpperCase()} ${path}: 403 missing`)
    }
  }
})

test('every operation says how it answers a malformed request', () => {
  for (const { path, method, operation } of operations()) {
    const codes = Object.keys(operation.responses)
    assert.ok(codes.includes('400'), `${method.toUpperCase()} ${path}: 400 missing`)
  }
})

test('writing operations require an Idempotency-Key', () => {
  for (const { path, method, operation } of operations()) {
    if (method === 'get') continue
    const refs = (operation.parameters ?? []).map((p) => p.$ref ?? '')
    assert.ok(
      refs.some((r) => r.endsWith('/IdempotencyKey')),
      `${method.toUpperCase()} ${path}: no Idempotency-Key`,
    )
  }
})

test('list endpoints send an ETag and answer If-None-Match with 304', () => {
  for (const { path, method, operation } of operations()) {
    const success = operation.responses['200']
    const returnsList = JSON.stringify(success ?? {}).includes('"items"')
    if (!returnsList) continue
    assert.ok(success.headers?.ETag, `${method.toUpperCase()} ${path}: ETag missing`)
    assert.ok(operation.responses['304'], `${method.toUpperCase()} ${path}: 304 missing`)
  }
})

test('the scope mapping matches docs/scopes.md', () => {
  const doc = readFileSync(join(root, 'docs', 'scopes.md'), 'utf8')
  for (const { path, method, operation } of operations()) {
    const scopes = scopesOf(operation)
    if (scopes.length === 0) continue
    const line = doc.split('\n').find((l) => l.includes(`${method.toUpperCase()} ${path}`))
    assert.ok(line, `${method.toUpperCase()} ${path} is missing from scopes.md`)
    for (const scope of scopes) {
      assert.ok(line.includes(scope), `scopes.md does not name ${scope} for ${path}`)
    }
  }
})

test('docs/scopes.md names the security scheme the contract actually has', () => {
  // The mapping tests above read endpoint and scope out of the table and would
  // not notice the name of the scheme going stale beside them. It did: the
  // document still said `kanzleiToken` after 0.4.0 renamed it in all fourteen
  // places of the contract.
  const doc = readFileSync(join(root, 'docs', 'scopes.md'), 'utf8')
  const declared = Object.keys(contract.components.securitySchemes)
  const named = [...doc.matchAll(/Sicherheitsschema `([^`]+)`/g)].map((match) => match[1])

  assert.ok(named.length > 0, 'scopes.md names no security scheme at all')
  for (const name of named) {
    assert.ok(declared.includes(name), `scopes.md names ${name}, the contract has ${declared}`)
  }
})

test('every declared scope is described in docs/scopes.md', () => {
  const doc = readFileSync(join(root, 'docs', 'scopes.md'), 'utf8')
  for (const scope of declaredScopes()) {
    assert.ok(doc.includes(`\`${scope}\``), `scopes.md does not describe ${scope}`)
  }
})

test('every operation takes part in version negotiation', () => {
  for (const { path, method, operation } of operations()) {
    const refs = (operation.parameters ?? []).map((p) => p.$ref ?? '')
    assert.ok(
      refs.some((r) => r.endsWith('/ApiVersion')),
      `${method.toUpperCase()} ${path}: the request header is missing`,
    )
    assert.ok(operation.responses['409'], `${method.toUpperCase()} ${path}: 409 missing`)
    for (const [code, response] of Object.entries(operation.responses)) {
      if (!code.startsWith('2')) continue
      assert.ok(
        response.headers?.['X-OpenGewerk-Api-Version'],
        `${method.toUpperCase()} ${path}: ${code} does not name the served version`,
      )
    }
  }
})

test('identifiers a generator turns into code are English', () => {
  const german = /[äöüß]|(?:ung|heit|keit|lesen|schreiben)/i
  const names = [
    ...Object.keys(contract.components.schemas ?? {}),
    ...Object.keys(contract.components.parameters ?? {}),
    ...Object.keys(contract.components.responses ?? {}),
    ...Object.keys(contract.components.headers ?? {}),
    ...Object.keys(contract.components.securitySchemes ?? {}),
    ...(contract.tags ?? []).map((t) => t.name),
    ...operations().map(({ operation }) => operation.operationId),
  ]
  const suspicious = names.filter((name) => german.test(name))
  assert.deepEqual(suspicious, [], 'these identifiers look German')
})

test('the contract version is mirrored in package.json', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.version, contract.info.version, 'package.json and info.version drifted apart')
})
