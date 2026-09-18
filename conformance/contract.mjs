// Shared helpers: load the contract and expose the payload schemas.
// Both test files build on this, the static one and the live one.

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { load as loadYaml } from 'js-yaml'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const here = dirname(fileURLToPath(import.meta.url))
export const root = join(here, '..')

export const openapiPath = join(root, 'openapi', 'opengewerk-kanzlei-api.yaml')
export const schemaDir = join(root, 'schemas')

// js-yaml resolves the core schema only, so load() does not construct arbitrary
// types. The file is our own contract, not external input.
export const contract = loadYaml(readFileSync(openapiPath, 'utf8'))

export const schemaFiles = readdirSync(schemaDir)
  .filter((name) => name.endsWith('.schema.json'))
  .sort()

export const schemas = Object.fromEntries(
  schemaFiles.map((name) => [name, JSON.parse(readFileSync(join(schemaDir, name), 'utf8'))]),
)

/** Every operation as a flat list, so the tests do not nest three levels deep. */
export function operations() {
  const methods = ['get', 'post', 'put', 'patch', 'delete']
  const list = []
  for (const [path, entry] of Object.entries(contract.paths)) {
    for (const [method, operation] of Object.entries(entry)) {
      if (methods.includes(method)) list.push({ path, method, operation })
    }
  }
  return list
}

/** Scopes an operation requires. An empty array means a valid token is enough. */
export function scopesOf(operation) {
  const entries = operation.security ?? contract.security ?? []
  return entries.flatMap((entry) => Object.values(entry).flat())
}

/** Scopes declared in the security scheme. */
export function declaredScopes() {
  const scheme = contract.components.securitySchemes.taxFirmToken
  return Object.keys(scheme.flows.clientCredentials.scopes)
}

/**
 * An Ajv instance holding every schema, reachable by file name.
 * Strict mode stays off because OpenAPI keywords such as `example` would trip it.
 */
export function validator() {
  const ajv = new Ajv2020({ strict: false, allErrors: true })
  addFormats(ajv)
  for (const [name, schema] of Object.entries(schemas)) {
    ajv.addSchema(schema, name)
  }
  return ajv
}

/** Validate data against a schema and return the errors in readable form. */
export function validate(ajv, schemaFile, data, subPath) {
  const key = subPath ? `${schemaFile}${subPath}` : schemaFile
  const check = ajv.getSchema(key)
  if (!check) throw new Error(`No schema registered under ${key}`)
  const valid = check(data)
  return {
    valid,
    errors: (check.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`),
  }
}
