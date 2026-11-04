<script setup lang="ts">
import { PhCaretUpDown, PhSignOut, PhUser } from '@phosphor-icons/vue'
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useEsci } from '@/composables/useEsci'
import { useIsDesktop } from '@/composables/useIsDesktop'
import { useProfilo } from '@/composables/useProfilo'

const { rigaPrincipale, emailSecondaria, iniziali } = useProfilo()
const { esci, inCorso } = useEsci()
const isDesktop = useIsDesktop()
const aperto = ref(false)

// Sotto lg la sidebar sparisce: il menu non deve restare appeso al nulla.
watch(isDesktop, (desktop) => {
  if (!desktop) aperto.value = false
})
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu v-model:open="aperto">
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="h-12 gap-2.5 rounded-xl border-[0.75px] border-border bg-card px-2 text-foreground shadow-glass [&>svg]:size-4"
          >
            <Avatar>
              <AvatarFallback>
                <template v-if="iniziali">{{ iniziali }}</template>
                <PhUser v-else class="size-4" />
              </AvatarFallback>
            </Avatar>
            <span class="flex min-w-0 flex-1 flex-col leading-tight">
              <span class="truncate text-sm font-medium">{{ rigaPrincipale }}</span>
              <span v-if="emailSecondaria" class="truncate text-xs text-subtle-foreground">
                {{ emailSecondaria }}
              </span>
            </span>
            <PhCaretUpDown class="text-subtle-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          :side-offset="8"
          class="w-(--reka-dropdown-menu-trigger-width)"
        >
          <DropdownMenuLabel class="flex flex-col gap-0.5 py-1.5 text-foreground">
            <span class="truncate text-sm font-semibold">{{ rigaPrincipale }}</span>
            <span
              v-if="emailSecondaria"
              class="truncate text-xs font-normal text-subtle-foreground"
            >
              {{ emailSecondaria }}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem as-child class="h-8">
            <RouterLink to="/account">
              <PhUser />
              Account
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem class="h-8" :disabled="inCorso" @select="esci">
            <PhSignOut />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
