export default defineNuxtPlugin((nuxtApp) => {
  const nonce = nuxtApp.ssrContext?.event.context.cspNonce
  if (!nonce) return

  // Autoriser les scripts produits par Nuxt/Unhead (importmap, configuration,
  // données structurées), sans réécrire ni autoriser du HTML de contenu.
  nuxtApp.ssrContext.head.hooks.hook('tags:resolve', ({ tags }) => {
    for (const tag of tags) {
      if (tag.tag === 'script') tag.props.nonce = nonce
    }
  })
})
