import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the production build can be served from any path
  // (e.g. GitHub Pages project sites, sub-folders, file://).
  base: './',
});
