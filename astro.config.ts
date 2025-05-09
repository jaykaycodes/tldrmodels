import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import alpinejs from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
    site: 'https://tldrmodels.com',
    output: 'static',
    integrations: [mdx(), sitemap(), alpinejs()],
    vite: {
        plugins: [tailwindcss()],
    },
    experimental: {
        contentIntellisense: true,
    },
})