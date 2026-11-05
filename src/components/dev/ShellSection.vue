<script setup lang="ts">
import { computed } from 'vue'
import iconaApp from '../../../icons/icon-512.png'
import favicon from '../../../icons/icon.svg'
import AppBottomBar from '@/components/AppBottomBar.vue'
import AppBottomBarItem from '@/components/AppBottomBarItem.vue'
import AppLogo from '@/components/AppLogo.vue'
import AppLogoIcon from '@/components/AppLogoIcon.vue'
import AppMobileHeader from '@/components/AppMobileHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopBar from '@/components/AppTopBar.vue'
import MenuUtentePreview from '@/components/dev/MenuUtentePreview.vue'
import PhoneFrame from '@/components/dev/PhoneFrame.vue'
import RottaCampione from '@/components/dev/RottaCampione.vue'
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import NavMain from '@/components/NavMain.vue'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigazione, type VoceNavigazione } from '@/composables/useNavigazione'
import VistaProfilo from '@/views/VistaProfilo.vue'

// La vetrina non è mai la pagina attiva: qui Home è forzata attiva per mostrarne lo stato.
const { vociMobili, vociDesktop } = useNavigazione()

function conHomeAttiva(voci: VoceNavigazione[]): VoceNavigazione[] {
  return voci.map((voce) => ({ ...voce, attiva: voce.chiave === 'home' }))
}

const vociDesktopCampione = computed(() => conHomeAttiva(vociDesktop.value))
const vociMobiliCampione = computed(() => conHomeAttiva(vociMobili.value))
</script>

<template>
  <ShowcaseSection id="shell">
    <ShowcaseBlock id="shell-marchio">
      <div class="flex flex-wrap items-end gap-10">
        <Specimen code="SHL-logo" note="segno 24 · 18 / 600">
          <AppLogo />
        </Specimen>
        <Specimen code="SHL-segno-24">
          <AppLogoIcon class-name="size-6 text-foreground" />
        </Specimen>
        <Specimen code="SHL-segno-40">
          <AppLogoIcon class-name="size-10 text-foreground" />
        </Specimen>
        <Specimen code="SHL-icona-180" note="raggio 40 · segno 120">
          <img :src="iconaApp" alt="Icona dell’app" class="size-45" />
        </Specimen>
        <Specimen code="SHL-icona-60" note="Home · raggio 14 · segno 40">
          <img :src="iconaApp" alt="Icona dell’app" class="size-15" />
        </Specimen>
        <Specimen code="SHL-favicon-32" note="raggio 7 · segno 24">
          <img :src="favicon" alt="Favicon" class="size-8" />
        </Specimen>
        <Specimen code="SHL-favicon-16">
          <img :src="favicon" alt="Favicon" class="size-4" />
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-sidebar">
      <p class="text-xs text-subtle-foreground">
        Dal breakpoint lg (1024px): il marchio, subito le sei voci e in fondo il piede utente.
        Registra non sta in sidebar ma nella barra in alto.
      </p>
      <div class="flex flex-wrap gap-6">
        <Specimen code="SHL-sidebar-desktop" note="232 · voci 40 · piede 48">
          <RottaCampione percorso="/">
            <div class="overflow-hidden rounded-2xl border-[0.75px] border-border">
              <AppSidebar class="static h-[560px]" />
            </div>
          </RottaCampione>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-voci">
      <p class="text-xs text-subtle-foreground">
        Voce attiva: icona piena e testo bianco; su desktop anche lo sfondo di vetro e la pillola
        bianca sul bordo sinistro.
      </p>
      <div class="flex flex-wrap items-start gap-10">
        <Specimen code="SHL-nav-desktop">
          <!-- Il contesto della sidebar lo dà già la shell dell'app. -->
          <div class="w-52">
            <NavMain :voci="vociDesktopCampione" />
          </div>
        </Specimen>
        <Specimen code="SHL-tabs-mobile" note="10 / 600">
          <div class="flex w-[300px]">
            <AppBottomBarItem v-for="voce in vociMobiliCampione" :key="voce.chiave" :voce="voce" />
          </div>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-barra-alta">
      <p class="text-xs text-subtle-foreground">
        Alta 64, titolo a sinistra; Registra solo in Home, Movimenti e Valori. Nessuna freccia
        indietro su desktop.
      </p>
      <div class="flex flex-col gap-6">
        <Specimen code="SHL-topbar-desktop" note="Home">
          <RottaCampione percorso="/">
            <AppTopBar class="w-[720px]" />
          </RottaCampione>
        </Specimen>
        <Specimen code="SHL-topbar-desktop-senza-registra" note="Futuro">
          <RottaCampione percorso="/futuro">
            <AppTopBar class="w-[720px]" />
          </RottaCampione>
        </Specimen>
        <Specimen code="SHL-navmenu-desktop">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Movimenti</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul class="grid w-64 gap-1 p-1">
                    <li>
                      <NavigationMenuLink as="button" class="w-full text-left">
                        Buste paga
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink as="button" class="w-full text-left">
                        Estratti conto
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  as="button"
                  :active="true"
                  :class="navigationMenuTriggerStyle()"
                >
                  Valori
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink as="button" :class="navigationMenuTriggerStyle()">
                  Fisco
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-menu-utente">
      <p class="text-xs text-subtle-foreground">
        Il piede della sidebar apre il menu sopra di sé, largo quanto il piede. Qui aperto in modo
        statico: il menu vero va in un portal.
      </p>
      <Specimen code="SHL-menu-utente-desktop" note="voci 32 · icona 16">
        <MenuUtentePreview />
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-testata-mobile">
      <p class="text-xs text-subtle-foreground">
        Sotto il breakpoint lg, in una cornice di telefono da 390px. Principale: titolo a sinistra e
        avatar verso Profilo, in Home il saluto e la data. Secondaria: indietro e titolo al centro.
      </p>
      <div class="flex flex-wrap gap-6">
        <Specimen code="SHL-header-mobile" note="Home">
          <RottaCampione percorso="/">
            <PhoneFrame size="header">
              <AppMobileHeader />
            </PhoneFrame>
          </RottaCampione>
        </Specimen>
        <Specimen code="SHL-header-secondaria-mobile" note="Fisco">
          <RottaCampione percorso="/fisco">
            <PhoneFrame size="header">
              <AppMobileHeader />
            </PhoneFrame>
          </RottaCampione>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-barra-bassa">
      <Specimen code="SHL-bottombar-mobile">
        <RottaCampione percorso="/">
          <PhoneFrame size="bar">
            <AppBottomBar />
          </PhoneFrame>
        </RottaCampione>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-telefono">
      <p class="text-xs text-subtle-foreground">
        Scorri dentro la cornice: testata e barra in basso sfumano nel contenuto senza bordo.
      </p>
      <Specimen code="SHL-phone-mobile">
        <RottaCampione percorso="/">
          <PhoneFrame>
            <AppMobileHeader />
            <div
              class="flex flex-col gap-3 px-4 pt-7 pb-[calc(var(--bottom-bar-height)+(--spacing(9)))]"
            >
              <Skeleton v-for="index in 8" :key="index" class="h-28 rounded-[24px]" />
            </div>
            <AppBottomBar />
          </PhoneFrame>
        </RottaCampione>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="shell-profilo">
      <p class="text-xs text-subtle-foreground">
        La pagina vera: testata secondaria, barra in basso senza voce accesa. Esci qui agisce come
        in app.
      </p>
      <Specimen code="SHL-profilo-mobile">
        <RottaCampione percorso="/profilo">
          <PhoneFrame>
            <AppMobileHeader />
            <!-- Il padding sta nella shell, non nella vista: nella cornice lo rimette l'involucro. -->
            <div class="px-4 pt-3 pb-[calc(var(--bottom-bar-height)+(--spacing(9)))]">
              <VistaProfilo />
            </div>
            <AppBottomBar />
          </PhoneFrame>
        </RottaCampione>
      </Specimen>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
