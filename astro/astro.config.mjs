import { defineConfig } from 'astro/config';

// Repo: https://github.com/meowrhino/ajutscat  → https://meowrhino.github.io/ajutscat
// If you move to a custom domain (ajuts.cat), set base: '/' and site: 'https://ajuts.cat',
// and add public/CNAME with the domain inside.
export default defineConfig({
  site: 'https://meowrhino.github.io',
  base: '/ajutscat',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
