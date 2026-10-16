import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { sqlite } from 'emdash/db';
import smallpics from '../../../dist/index.js';

export default defineConfig({
	site: 'https://fixture.example.com',
	output: 'server',
	adapter: node({ mode: 'standalone' }),
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: 'file:./.test-media.db' }),
			images: false,
		}),
		smallpics({
			sources: {
				media: {
					baseUrl: 'https://media.smallpics.io',
					defaultParams: { q: 80 },
					secret: 'fixture-secret',
				},
			},
		}),
	],
});
