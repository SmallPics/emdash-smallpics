import smallpics, {
	resolveImage,
	type MediaValue,
	type SmallPicsConfig,
} from '@smallpics/emdash';
import type { AstroIntegration } from 'astro';

const image: MediaValue = {
	id: '01ABC',
	meta: { storageKey: '01ABC.jpg' },
	width: 1200,
	height: 800,
	focalX: 0.25,
	focalY: 0.75,
};

const config: SmallPicsConfig = { baseUrl: 'https://media.smallpics.io' };

const integration: AstroIntegration = smallpics(config);

const src: string = resolveImage(image).src;

// @ts-expect-error A media ID must be a string.
resolveImage({ id: 42 });

void integration;

void src;

const trimMode: import('@smallpics/emdash').TrimMode = 'either';
void trimMode;
