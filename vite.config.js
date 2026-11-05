import tailwindcss from '@tailwindcss/vite';
import adapterAuto from '@sveltejs/adapter-auto';
import adapterVercel from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const isVercel = Boolean(process.env.VERCEL);
const adapter = isVercel ? adapterVercel() : adapterAuto();

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			alias: {
				$lib: 'src/lib'
			},
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter
		})
	]
});
