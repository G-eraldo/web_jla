export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = event.context.cspNonce
    if (!nonce) return

    // nuxt-site-config ajoute cette entrée autonome après le rendu Unhead.
    // Ne jamais ajouter un nonce aux scripts présents dans le HTML des pages.
    html.body = html.body.map((entry) =>
      /^<script>window\.__NUXT_SITE_CONFIG__=[^<]*<\/script>$/.test(entry)
        ? entry.replace('<script>', `<script nonce="${nonce}">`)
        : entry)
  })
})
