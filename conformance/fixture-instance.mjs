// A stand-in instance that answers the contract, so the live conformance suite
// can be run and reviewed while no implementation exists yet.
//
// This is a test fixture, not a reference implementation. Everything that can be
// derived from the contract is derived from it: which endpoints exist, which
// scopes they need, which parameters are required, how version negotiation
// answers. Only the payloads are fixed samples, and every payload is validated
// against its schema before it leaves the process, so the fixture cannot drift
// away from schemas/ without failing loudly.
//
// Start it on its own:
//   node conformance/fixture-instance.mjs
// Run the live suite against it:
//   npm run test:fixture

import { createServer } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  contract, operations, parametersOf, scopesOf, declaredScopes, validator, validate,
} from './contract.mjs'

export const basePath = '/api/kanzlei/v1'

// A token carries its own scopes, so a caller can ask for any set of them
// without a token endpoint. The contract leaves the handshake open on purpose.
const tokenPrefix = 'fixture.'
export const fullToken = tokenPrefix + declaredScopes().join(',')
export const scopelessToken = tokenPrefix

const version = contract.info.version
const ajv = validator()

// --- sample payloads -------------------------------------------------------

const digest = (text) => createHash('sha256').update(text).digest('hex')

const periods = [
  {
    identifier: '2027-01',
    kind: 'month',
    from_date: '2027-01-01',
    to_date: '2027-01-31',
    is_locked: true,
    locked_at: '2027-02-10T08:00:00Z',
    vat_return: {
      status: 'submitted',
      is_preview: true,
      net_sales_cents: 1250000,
      output_tax_cents: 237500,
      input_tax_cents: 94300,
      payable_cents: 143200,
      currency: 'EUR',
      submitted_at: '2027-02-10T09:15:00Z',
      permanent_extension: false,
    },
  },
  {
    identifier: '2027-02',
    kind: 'month',
    from_date: '2027-02-01',
    to_date: '2027-02-28',
    is_locked: false,
    vat_return: {
      status: 'draft',
      is_preview: true,
      net_sales_cents: 980000,
      output_tax_cents: 186200,
      input_tax_cents: 51000,
      payable_cents: 135200,
      currency: 'EUR',
    },
  },
]

const journal = [
  {
    id: 'je-2027-000101',
    entry_number: '000101',
    booking_date: '2027-01-12',
    document_date: '2027-01-12',
    period: '2027-01',
    debit_account: '1400',
    credit_account: '8400',
    amount_cents: 148750,
    currency: 'EUR',
    tax_key: '3',
    tax_amount_cents: 23750,
    text: 'Rechnung 2027-0007, Zählerschrank Musterstraße 1',
    document_id: 'doc-2027-0007',
    document_number: '2027-0007',
    is_locked: true,
    locked_at: '2027-02-10T08:00:00Z',
    created_at: '2027-01-12T16:20:00Z',
    source: 'Rechnungsausgang',
  },
  {
    id: 'je-2027-000148',
    booking_date: '2027-02-03',
    period: '2027-02',
    debit_account: '1200',
    credit_account: '1400',
    amount_cents: 148750,
    currency: 'EUR',
    text: 'Zahlungseingang Rechnung 2027-0007',
    document_number: '2027-0007',
    is_locked: false,
    created_at: '2027-02-03T07:45:00Z',
    source: 'Bank',
  },
]

const accounts = [
  {
    number: '1200',
    name: 'Bank',
    chart_of_accounts: 'SKR03',
    account_type: 'asset',
    is_automatic_account: false,
    is_active: true,
  },
  {
    number: '1400',
    name: 'Forderungen aus Lieferungen und Leistungen',
    chart_of_accounts: 'SKR03',
    account_type: 'receivable',
    is_automatic_account: false,
    is_active: true,
  },
  {
    number: '8400',
    name: 'Erlöse 19 % USt',
    chart_of_accounts: 'SKR03',
    account_type: 'revenue',
    is_automatic_account: true,
    default_tax_key: '3',
    is_active: true,
  },
]

const balances = [
  {
    account_number: '1200',
    account_name: 'Bank',
    as_of_date: '2027-02-28',
    opening_balance_cents: 0,
    debit_total_cents: 148750,
    credit_total_cents: 0,
    balance_cents: 148750,
    currency: 'EUR',
  },
  {
    account_number: '8400',
    account_name: 'Erlöse 19 % USt',
    as_of_date: '2027-02-28',
    opening_balance_cents: 0,
    debit_total_cents: 0,
    credit_total_cents: 125000,
    balance_cents: 125000,
    currency: 'EUR',
  },
]

const openItems = [
  {
    id: 'op-2027-0011',
    type: 'receivable',
    account_number: '1400',
    partner_number: '10023',
    partner_name: 'Hausverwaltung Musterstadt GmbH',
    document_number: '2027-0011',
    document_id: 'doc-2027-0011',
    document_date: '2027-02-18',
    due_date: '2027-03-04',
    amount_cents: 297500,
    open_amount_cents: 297500,
    currency: 'EUR',
    cash_discount_date: '2027-02-25',
    cash_discount_cents: 5950,
    dunning_level: 0,
  },
]

const documents = {
  'doc-2027-0007': {
    id: 'doc-2027-0007',
    document_number: '2027-0007',
    document_type: 'outgoing_invoice',
    document_date: '2027-01-12',
    partner_name: 'Hausverwaltung Musterstadt GmbH',
    total_gross_cents: 148750,
    total_net_cents: 125000,
    currency: 'EUR',
    is_locked: true,
    journal_entry_ids: ['je-2027-000101'],
    files: [
      {
        role: 'pdf',
        content_type: 'application/pdf',
        sha256: digest('fixture invoice 2027-0007 pdf'),
        size_bytes: 41230,
        download_url: 'https://betrieb.example/files/2027-0007.pdf',
      },
      {
        role: 'einvoice_xml',
        content_type: 'application/xml',
        sha256: digest('fixture invoice 2027-0007 xml'),
        size_bytes: 9840,
        download_url: 'https://betrieb.example/files/2027-0007.xml',
        einvoice_format: 'xrechnung',
      },
    ],
  },
}

// Grows with every request, newest first, so a caller finds its own call again.
const accessLog = []

// --- request handling ------------------------------------------------------

const fail = (code, message, extra = {}) => ({ code, message, ...extra })

const page = (items) => ({ items, next_cursor: null })

/** Match a request against the paths of the contract, not against a list kept here. */
function route(method, path) {
  for (const entry of operations()) {
    if (entry.method !== method.toLowerCase()) continue
    const pattern = new RegExp(`^${entry.path.replace(/\{[^}]+\}/g, '([^/]+)')}$`)
    const match = pattern.exec(path)
    if (match) return { ...entry, pathParams: match.slice(1) }
  }
  return undefined
}

const endpoints = {
  readPeriods: {
    itemSchema: 'period.schema.json',
    handle: ({ query }) => {
      const year = query.get('year')
      const wanted = year ? periods.filter((p) => p.identifier.startsWith(year)) : periods
      return { status: 200, body: page(wanted) }
    },
  },
  readJournal: {
    itemSchema: 'journal-entry.schema.json',
    handle: ({ query }) => {
      const from = query.get('from')
      const to = query.get('to')
      const wanted = journal.filter((entry) => entry.booking_date >= from && entry.booking_date <= to)
      return { status: 200, body: page(wanted) }
    },
  },
  readAccounts: {
    itemSchema: 'account.schema.json',
    handle: () => ({ status: 200, body: page(accounts) }),
  },
  readBalances: {
    itemSchema: 'balance.schema.json',
    handle: () => ({ status: 200, body: page(balances) }),
  },
  readOpenItems: {
    itemSchema: 'open-item.schema.json',
    handle: () => ({ status: 200, body: page(openItems) }),
  },
  readAccessLog: {
    itemSchema: 'access-log-entry.schema.json',
    handle: () => ({ status: 200, body: page(accessLog.slice(0, 200)) }),
  },
  readDocument: {
    schema: 'document.schema.json',
    handle: ({ pathParams }) => {
      const document = documents[pathParams[0]]
      if (!document) return { status: 404, body: fail('not_found', `no document ${pathParams[0]}`) }
      return { status: 200, body: document }
    },
  },
  createInquiry: {
    schema: 'inquiry.schema.json',
    handle: ({ body }) => {
      const checked = validate(ajv, 'inquiry.schema.json', body, '#/$defs/New')
      if (!checked.valid) {
        return { status: 422, body: fail('unprocessable_entity', checked.errors.join(', ')) }
      }
      return {
        status: 201,
        body: {
          id: `inq-${randomUUID()}`,
          status: 'open',
          subject: body.subject,
          body: body.body,
          reference: body.reference,
          created_at: new Date().toISOString(),
          created_by: 'Fixture-Kanzlei',
          ...(body.due_date ? { due_date: body.due_date } : {}),
        },
      }
    },
  },
  submitProposal: {
    schema: 'booking-proposal.schema.json',
    handle: ({ body }) => {
      const checked = validate(ajv, 'booking-proposal.schema.json', body, '#/$defs/New')
      if (!checked.valid) {
        return { status: 422, body: fail('unprocessable_entity', checked.errors.join(', ')) }
      }
      return {
        status: 201,
        body: {
          id: `bp-${randomUUID()}`,
          status: 'proposed',
          lines: body.lines,
          created_at: new Date().toISOString(),
          created_by: 'Fixture-Kanzlei',
          ...(body.reference ? { reference: body.reference } : {}),
          ...(body.comment ? { comment: body.comment } : {}),
          ...(body.post_directly === undefined ? {} : { post_directly: body.post_directly }),
        },
      }
    },
  },
  setChartOfAccountsProfile: {
    schema: 'chart-of-accounts-profile.schema.json',
    handle: ({ body }) => {
      const checked = validate(ajv, 'chart-of-accounts-profile.schema.json', body)
      if (!checked.valid) {
        return { status: 422, body: fail('unprocessable_entity', checked.errors.join(', ')) }
      }
      return { status: 200, body }
    },
  },
  startAuditExport: {
    handle: () => ({ status: 202, body: { status: 'accepted', export_id: `ex-${randomUUID()}` } }),
  },
}

// Answers already given, so a repeated Idempotency-Key does not create a second record.
const answered = new Map()

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return undefined
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return undefined
  }
}

/** Refuse to serve a payload that breaks the very schemas this repository ships. */
function checkPayload(operationId, result) {
  const endpoint = endpoints[operationId]
  if (result.status >= 300) return
  if (endpoint.itemSchema) {
    for (const item of result.body.items) {
      const checked = validate(ajv, endpoint.itemSchema, item)
      if (!checked.valid) {
        throw new Error(`${operationId} serves an item breaking ${endpoint.itemSchema}: ${checked.errors.join(', ')}`)
      }
    }
  } else if (endpoint.schema) {
    const checked = validate(ajv, endpoint.schema, result.body)
    if (!checked.valid) {
      throw new Error(`${operationId} serves a payload breaking ${endpoint.schema}: ${checked.errors.join(', ')}`)
    }
  }
}

/**
 * Whether a caller built against `asked` can read what an instance on `serves`
 * answers. The major decides, except while it is 0: the contract may change in
 * any minor until 1.0.0, so comparing the zero alone would compare nothing.
 */
function compatible(asked, serves) {
  const [askedMajor, askedMinor] = asked.split('.')
  const [servesMajor, servesMinor] = serves.split('.')

  if (askedMajor !== servesMajor) return false

  return servesMajor !== '0' || askedMinor === servesMinor
}

async function answer(request) {
  const url = new URL(request.url, 'http://fixture.invalid')
  const path = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : undefined

  // Version negotiation comes first: it decides whether the caller could read an
  // answer at all.
  const requested = request.headers['x-opengewerk-api-version']
  if (requested && !compatible(requested, version)) {
    return { status: 409, body: fail('api_version_incompatible', `this instance serves ${version}`) }
  }

  if (path === undefined) {
    return { status: 404, body: fail('not_found', `${url.pathname} is outside ${basePath}`) }
  }

  const match = route(request.method, path)
  if (!match) {
    return { status: 404, body: fail('not_found', `${request.method} ${path} is not part of the contract`) }
  }

  const token = (request.headers.authorization ?? '').replace(/^Bearer /, '')
  if (!token.startsWith(tokenPrefix)) {
    return { status: 401, body: fail('unauthenticated', 'no valid bearer token') }
  }
  const granted = token.slice(tokenPrefix.length).split(',').filter(Boolean)

  const missing = scopesOf(match.operation).find((scope) => !granted.includes(scope))
  if (missing) {
    return {
      status: 403,
      body: fail('scope_missing', `the client lacks the scope ${missing}`, { scope: missing }),
      missingScope: missing,
    }
  }

  for (const parameter of parametersOf(match.operation)) {
    if (!parameter.required) continue
    if (parameter.in === 'query' && !url.searchParams.has(parameter.name)) {
      return {
        status: 400,
        body: fail('parameter_missing', `the query parameter ${parameter.name} is required`, {
          parameter: parameter.name,
        }),
      }
    }
    if (parameter.in === 'header' && !request.headers[parameter.name.toLowerCase()]) {
      return {
        status: 400,
        body: fail('header_missing', `the header ${parameter.name} is required`, {
          parameter: parameter.name,
        }),
      }
    }
  }

  const idempotencyKey = request.headers['idempotency-key']
  const memory = idempotencyKey ? `${match.operation.operationId}:${idempotencyKey}` : undefined
  if (memory && answered.has(memory)) return { ...answered.get(memory), status: 200 }

  const body = request.method === 'GET' ? undefined : await readBody(request)
  const result = endpoints[match.operation.operationId].handle({
    query: url.searchParams,
    pathParams: match.pathParams,
    body,
  })
  checkPayload(match.operation.operationId, result)
  if (memory && result.status < 300) answered.set(memory, result)
  return result
}

function etagFor(payload) {
  return `"${digest(JSON.stringify(payload)).slice(0, 32)}"`
}

function log(request, result) {
  accessLog.unshift({
    id: `al-${randomUUID()}`,
    occurred_at: new Date().toISOString(),
    method: request.method,
    path: request.url,
    status_code: result.status,
    firm_name: 'Fixture-Kanzlei',
    request_id: randomUUID(),
    ...(result.missingScope ? { missing_scope: result.missingScope } : {}),
  })
}

/** Start the fixture. Port 0 lets the operating system pick a free one. */
export async function startFixture(port = 0) {
  const server = createServer((request, response) => {
    answer(request)
      .then((result) => {
        log(request, result)
        const headers = {
          'X-OpenGewerk-Api-Version': version,
          'Content-Type': 'application/json; charset=utf-8',
        }
        if (request.method === 'GET' && result.status === 200) {
          const etag = etagFor(result.body)
          headers.ETag = etag
          if (request.headers['if-none-match'] === etag) {
            response.writeHead(304, headers).end()
            return
          }
        }
        response.writeHead(result.status, headers).end(JSON.stringify(result.body))
      })
      .catch((error) => {
        console.error(error)
        const headers = {
          'X-OpenGewerk-Api-Version': version,
          'Content-Type': 'application/json; charset=utf-8',
        }
        response.writeHead(500, headers).end(JSON.stringify(fail('internal_error', error.message)))
      })
  })

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  const { port: listening } = server.address()
  return {
    baseUrl: `http://127.0.0.1:${listening}${basePath}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = await startFixture(Number(process.env.PORT) || 4010)
  console.log(`OPENGEWERK_BASE_URL=${fixture.baseUrl}`)
  console.log(`OPENGEWERK_TOKEN=${fullToken}`)
  console.log(`OPENGEWERK_TOKEN_WITHOUT_SCOPES=${scopelessToken}`)
}
