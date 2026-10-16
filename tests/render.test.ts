import { test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('renders Astro, EmDash image fields, rich text and galleries through Small Pics', () => {
	const root = fileURLToPath(new URL('./fixtures/site/', import.meta.url));

	execFileSync(
		process.execPath,
		[
			fileURLToPath(
				new URL('../node_modules/astro/bin/astro.mjs', import.meta.url),
			),
			'build',
			'--root',
			root,
		],
		{ cwd: root, encoding: 'utf8', timeout: 120000 },
	);

	const html = readFileSync(
		new URL('./fixtures/site/dist/client/index.html', import.meta.url),
		'utf8',
	);

	expect(html).toContain('alt="Astro bird"');

	expect(html).toContain('alt="Rich text bird"');

	expect(html).toContain('alt="Gallery bird"');

	const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);

	expect(images).toHaveLength(4);

	for (const image of images) {
		expect(image).toContain('src="https://media.smallpics.io/bird.jpg?');

		expect(image).toContain('srcset="https://media.smallpics.io/bird.jpg?');

		expect(image).toMatch(/[&;]s=[A-Za-z0-9]+/);
	}

	expect(html).toContain('fp=25p:75p');

	const trimmed = images.find((image) => image.includes('trim=either'));
	expect(trimmed).toContain('border=12,transparent,expand');
	expect(trimmed).toContain('trim-pad=8');
	expect(trimmed).toContain('fm=png');

	expect(html).not.toContain('fixture-secret');

	expect(html).not.toContain('src="/_image');
}, 120000);
