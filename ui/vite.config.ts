import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// Static build for the bridge's container_ui.rs (CHAT_UI_DIR): index.html plus assets/.
export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', strict: true }),
      appDir: 'assets'
    })
  ],
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
