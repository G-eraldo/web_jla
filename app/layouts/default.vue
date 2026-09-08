<template>
    <a href="#main-content" class="sr-only z-50 bg-white p-4 focus:fixed focus:left-4 focus:top-4 focus:not-sr-only">Aller au contenu</a>
    <AppHeader />
    <main id="main-content" tabindex="-1">
        <slot />
    </main>
    <AppFooter />
</template>
