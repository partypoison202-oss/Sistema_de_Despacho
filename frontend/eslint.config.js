import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // React 17+ con el nuevo JSX transform no requiere importar React
      // Desactivado para no generar warnings de variables no usadas (código legacy válido)
      'no-unused-vars': 'off',

      // Desactivado: genera falsos positivos en hooks con dependencias dinámicas
      'react-hooks/exhaustive-deps': 'off',

      // Desactivar reglas nuevas de react-hooks v5 muy estrictas que rompen patrones válidos
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
])
