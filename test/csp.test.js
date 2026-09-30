import assert from 'node:assert/strict'
import test from 'node:test'
import { createHead, renderSSRHead } from '@unhead/vue/server'

globalThis.defineEventHandler = handler => handler
globalThis.defineNuxtPlugin = plugin => plugin
globalThis.useRuntimeConfig = () => ({ public: { strapiUrl: 'https://back.example.test' } })
globalThis.setResponseHeader = (event, name, value) => { event.headers[name] = value }
globalThis.removeResponseHeader = (event, name) => { delete event.headers[name] }
globalThis.getRequestProtocol = () => 'https'
globalThis.getRequestPath = () => '/'

const middleware = (await import('../server/middleware/security.js')).default
const plugin = (await import('../app/plugins/csp.server.js')).default

test('la CSP utilise un nonce différent par requête et autorise les scripts Nuxt rendus', () => {
  const event = { context: {}, headers: {} }
  const other = { context: {}, headers: {} }
  middleware(event)
  middleware(other)
  const policy = event.headers['Content-Security-Policy']
  const scriptPolicy = policy.split('; ').find(value => value.startsWith('script-src '))
  assert.ok(!scriptPolicy.includes('unsafe-inline'))
  assert.match(policy, /script-src-attr 'none'/)
  assert.notEqual(event.context.cspNonce, other.context.cspNonce)
  assert.ok(scriptPolicy.includes(`'nonce-${event.context.cspNonce}'`))

  const head = createHead()
  plugin({ ssrContext: { event, head } })
  head.push({ script: [
    { type: 'importmap', innerHTML: '{"imports":{"#entry":"/entry.js"}}' },
    { innerHTML: 'window.__NUXT__={}' },
    { src: '/entry.js', type: 'module' }
  ] })
  const rendered = renderSSRHead(head)
  assert.equal((rendered.headTags.match(new RegExp(`nonce="${event.context.cspNonce.replace(/[+]/g, '\\+')}"`, 'g')) || []).length, 3)
})

test('autorise seulement le bloc autonome du module site-config hors Unhead', async () => {
  globalThis.defineNitroPlugin = plugin => plugin
  const serverPlugin = (await import('../server/plugins/csp.js')).default
  let render
  serverPlugin({ hooks: { hook: (_name, callback) => { render = callback } } })
  const trusted = '<script>window.__NUXT_SITE_CONFIG__={url:"https://example.test"}</script>'
  const content = '<div><script>window.__NUXT_SITE_CONFIG__=alert(1)</script></div>'
  const other = '<script>alert(1)</script>'
  const html = { body: [trusted, content, other] }
  render(html, { event: { context: { cspNonce: 'test-nonce' } } })
  assert.equal(html.body[0], trusted.replace('<script>', '<script nonce="test-nonce">'))
  assert.equal(html.body[1], content)
  assert.equal(html.body[2], other)
})
