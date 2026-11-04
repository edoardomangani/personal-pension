import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/file-da-controllare',
    files: ['**/*.{ts,mts,tsx,vue,js,mjs}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    'prototype/**',
    'ciclo/**',
    'data/**',
    'docs/**',
    'icons/**',
    '.claude/**',
  ]),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    name: 'app/divieti',
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  skipFormatting,
)
