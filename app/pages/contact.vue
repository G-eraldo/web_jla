<script setup>
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Contact — Maison JLA',
  description: 'Une question sur un bijou ou une commande ? Contactez Maison JLA grâce à notre formulaire.',
  ogTitle: 'Contact — Maison JLA',
  ogDescription: 'Une question sur un bijou ou une commande ? Écrivez-nous, nous vous répondrons avec plaisir.'
})

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  subject: '',
  orderReference: '',
  message: '',
  website: ''
})
const loading = ref(false)
const errorMessage = ref('')
const sent = ref(false)

async function sendMessage() {
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    sent.value = true
  } catch (error) {
    errorMessage.value = error.data?.message || 'Le message n’a pas pu être envoyé. Vous pouvez écrire à contact@maisonjla.fr.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="bg-[#fffaf6] px-6 py-16 sm:px-8 sm:py-24">
    <div class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <div>
        <p class="text-xs uppercase tracking-[.2em] text-[#9b712d]">À votre écoute</p>
        <h1 class="mt-4 font-serif text-5xl text-[#302722] sm:text-6xl">Contactez-nous</h1>
        <p class="mt-6 max-w-md text-sm leading-7 text-[#776b64]">Une question sur un bijou, votre commande ou la
          livraison ? Écrivez-nous, nous vous répondrons avec plaisir.</p>
        <div class="mt-10 border-l border-[#bfa36d] pl-6 text-sm leading-7 text-[#514640]">
          <p class="font-medium text-[#302722]">Maison JLA</p>
          <p>5 Rue Joliot-Curie<br>80200 Doingt</p>
          <a class="mt-3 inline-block text-[#9b712d] underline underline-offset-4"
            href="mailto:contact@maisonjla.fr">contact@maisonjla.fr</a>
          <a class="block text-[#9b712d] underline underline-offset-4" href="tel:+33677886909">06 77 88 69 09</a>
        </div>
      </div>

      <div v-if="sent" class="self-start border border-[#bfa36d] bg-white p-8 text-sm leading-7 text-[#514640] sm:p-10"
        role="status">
        <p class="text-xs uppercase tracking-[.2em] text-[#9b712d]">Message envoyé</p>
        <h2 class="mt-3 font-serif text-3xl text-[#302722]">Merci {{ form.firstName }}.</h2>
        <p class="mt-4">Votre message a bien été transmis à Maison JLA. Nous vous répondrons à l’adresse <strong>{{
          form.email }}</strong>.</p>
        <button type="button" class="mt-7 border-b border-[#a48e7b] pb-1 text-sm" @click="sent = false">Envoyer un autre
          message</button>
      </div>

      <form v-else class="space-y-6 bg-white p-6 shadow-sm sm:p-10" @submit.prevent="sendMessage">
        <div class="grid gap-5 sm:grid-cols-2">
          <label for="contact-first-name" class="text-sm">Prénom
            <input id="contact-first-name" v-model.trim="form.firstName" required maxlength="100"
              autocomplete="given-name"
              class="mt-2 w-full border border-[#d9d0c8] bg-white p-4 focus:border-[#9b712d] focus:outline-none">
          </label>
          <label for="contact-last-name" class="text-sm">Nom
            <input id="contact-last-name" v-model.trim="form.lastName" required maxlength="100"
              autocomplete="family-name"
              class="mt-2 w-full border border-[#d9d0c8] bg-white p-4 focus:border-[#9b712d] focus:outline-none">
          </label>
          <label for="contact-email" class="text-sm sm:col-span-2">E-mail
            <input id="contact-email" v-model.trim="form.email" required maxlength="254" type="email"
              autocomplete="email"
              class="mt-2 w-full border border-[#d9d0c8] bg-white p-4 focus:border-[#9b712d] focus:outline-none">
          </label>
          <label for="contact-subject" class="text-sm sm:col-span-2">Objet
            <input id="contact-subject" v-model.trim="form.subject" required maxlength="120"
              class="mt-2 w-full border border-[#d9d0c8] bg-white p-4 focus:border-[#9b712d] focus:outline-none">
          </label>
          <label for="contact-order" class="text-sm sm:col-span-2">Numéro de commande <span
              class="text-[#776b64]">(facultatif)</span>
            <input id="contact-order" v-model.trim="form.orderReference" maxlength="100" placeholder="JLA-…"
              class="mt-2 w-full border border-[#d9d0c8] bg-white p-4 focus:border-[#9b712d] focus:outline-none">
          </label>
          <label for="contact-message" class="text-sm sm:col-span-2">Votre message
            <textarea id="contact-message" v-model.trim="form.message" required maxlength="5000" rows="7"
              class="mt-2 w-full resize-y border border-[#d9d0c8] bg-white p-4 focus:border-[#9b712d] focus:outline-none"></textarea>
          </label>
          <label class="hidden" aria-hidden="true">Site internet
            <input v-model="form.website" tabindex="-1" autocomplete="off">
          </label>
        </div>

        <p class="text-xs leading-6 text-[#776b64]">Les informations saisies servent uniquement à répondre à votre
          demande. Pour en savoir plus, consultez notre <NuxtLink class="underline underline-offset-4"
            to="/politique-confidentialite">politique de confidentialité</NuxtLink>.</p>
        <p v-if="errorMessage" class="text-sm text-red-700" role="alert">{{ errorMessage }}</p>
        <button type="submit"
          class="min-h-12 bg-[#302722] px-8 py-3 text-sm text-white transition hover:bg-[#514137] disabled:cursor-wait disabled:opacity-60"
          :disabled="loading">
          {{ loading ? 'Envoi en cours…' : 'Envoyer mon message' }}
        </button>
      </form>
    </div>
  </section>
</template>
