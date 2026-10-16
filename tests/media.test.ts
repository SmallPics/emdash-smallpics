import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
	resolveImage,
	imageBlockValue,
	focalPoint,
	mediaStorageOptions,
} from '../dist/index.js';

test('uses a storage key rather than a bare EmDash media ID', () => {
	assert.equal(
		resolveImage({
			id: '01ABC',
			meta: { storageKey: '01ABC.jpg' },
			width: 1200,
			height: 800,
		}).src,
		'01ABC.jpg',
	);

	assert.throws(() => resolveImage({ id: '01ABC' }), /storage key|URL/);
});

test('maps internal file URLs and preserves existing delivery URLs', () => {
	assert.equal(
		resolveImage({ src: '/_emdash/api/media/file/01ABC.jpg' }).src,
		'01ABC.jpg',
	);

	assert.equal(
		resolveImage('https://media.smallpics.io/bird.jpg').src,
		'https://media.smallpics.io/bird.jpg',
	);

	assert.throws(
		() => resolveImage({ provider: 'cloudflare-images', id: 'abc' }),
		/provider/,
	);
});

test('maps focal points and honors explicit transform options', () => {
	assert.equal(focalPoint(0, 1), '0p:100p');

	assert.throws(() => focalPoint(2, 0));

	const result = resolveImage(
		{ src: 'a.jpg', width: 1200, height: 800, focalX: 0.25, focalY: 0.75 },
		{ width: 400, height: 400, fit: 'cover' },
	);

	assert.equal(result.smallpics.fp, '25p:75p');

	assert.equal(
		resolveImage(
			{ src: 'a.jpg', focalX: 0.25, focalY: 0.75 },
			{ smallpics: { fp: '10p:20p' } },
		).smallpics.fp,
		'10p:20p',
	);
});

test('resolves rich text references and hydrated media values', () => {
	const media = imageBlockValue({
		asset: {
			_ref: '01ABC',
			url: '/_emdash/api/media/file/01ABC.jpg',
			width: 900,
			height: 600,
		},
		alt: '',
		focalX: 0.2,
		focalY: 0.8,
	});

	assert.equal(resolveImage(media).src, '01ABC.jpg');

	assert.equal(media.alt, '');

	assert.equal(media.width, 900);

	assert.equal(
		resolveImage(
			imageBlockValue({
				asset: { id: '01ABC', meta: { storageKey: '01ABC.jpg' } },
			}),
		).src,
		'01ABC.jpg',
	);
});

test('storage helper supplies the delivery URL without changing the binding', () => {
	assert.deepEqual(
		mediaStorageOptions('https://media.smallpics.io/', 'UPLOADS'),
		{ binding: 'UPLOADS', publicUrl: 'https://media.smallpics.io' },
	);
});

test('preserves aspect ratio when one dimension changes', () => {
	const image = { src: 'a.jpg', width: 1200, height: 800 };

	assert.equal(resolveImage(image, { width: 600 }).height, 400);

	assert.equal(resolveImage(image, { height: 400 }).width, 600);
});

test('preserves dark variants and descriptive metadata from fields', () => {
	const media = {
		src: 'light.jpg',
		alt: 'Bird',
		darkVariant: { src: 'dark.jpg' },
	};

	assert.equal(resolveImage(media).alt, 'Bird');

	assert.equal(resolveImage(media, { alt: '' }).alt, '');

	assert.deepEqual(media.darkVariant, { src: 'dark.jpg' });
});

test('passes trim controls and transparent border values to the image service', () => {
	for (const border of [
		'12,transparent,expand',
		'12,00ffffff,expand',
		'12,50ff0000,overlay',
	]) {
		const smallpics = {
			trim: 'either',
			'trim-color': 'ffffff',
			'trim-alpha': 0,
			'trim-tol': 2,
			'trim-pad': 8,
			'trim-md': 11,
			'trim-sd': 10,
			border,
		};
		assert.deepEqual(
			resolveImage({ src: 'a.png' }, { smallpics }).smallpics,
			smallpics,
		);
	}
});
