<script setup lang="ts">
// Pagine di accesso e onboarding: niente shell né toast. Il bagliore sta già sul body.
</script>

<template>
  <main class="flex min-h-svh flex-col items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <slot />
    </div>
  </main>
</template>
