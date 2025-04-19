import { defineConfig } from 'astro/config'

import expressiveCode from 'astro-expressive-code'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

import { spectreDark } from './src/ec-theme'

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://tldrmodels.com',
  output: 'static',

  integrations: [
    expressiveCode({
      themes: [spectreDark],
    }),
    mdx(),
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});