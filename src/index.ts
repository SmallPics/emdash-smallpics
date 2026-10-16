import smallpics, { type TransformOptions } from 'astro-smallpics';

export { default } from 'astro-smallpics';

export type {
	SmallPicsConfig,
	TransformOptions,
	TrimMode,
} from 'astro-smallpics';

/** Structural subset of EmDash media values; accepts both fields and seeded media. */
export interface MediaValue {
	id?: string;
	src?: string;
	url?: string;
	provider?: string;
	alt?: string;
	width?: number;
	height?: number;
	focalX?: number | null;
	focalY?: number | null;
	dominantColor?: string;
	darkVariant?: MediaValue | string | null;
	meta?: Record<string, unknown>;
}

export interface ImageOptions {
	width?: number;
	height?: number;
	alt?: string;
	fit?: string;
	smallpics?: TransformOptions;
}

export interface ImageBlock extends MediaValue {
	asset?: MediaValue & { _ref?: string };
	displayWidth?: number;
	displayHeight?: number;
	caption?: string;
	title?: string;
	alignment?: 'left' | 'center' | 'right' | 'wide' | 'full';
	link?: string | { href: string; blank?: boolean };
}

export function focalPoint(x: unknown, y: unknown): string | undefined {
	if (x == null && y == null) {
		return undefined;
	}

	if (
		typeof x !== 'number' ||
		typeof y !== 'number' ||
		!Number.isFinite(x) ||
		!Number.isFinite(y) ||
		x < 0 ||
		x > 1 ||
		y < 0 ||
		y > 1
	) {
		throw new TypeError(
			'Focal point coordinates must both be between 0 and 1.',
		);
	}

	return `${Math.round(x * 10000) / 100}p:${Math.round(y * 10000) / 100}p`;
}

export function resolveImage(
	image: MediaValue | string,
	options: ImageOptions = {},
) {
	const media = typeof image === 'string' ? { src: image } : image;

	if (media.provider && media.provider !== 'local') {
		throw new TypeError(
			`Unsupported media provider: ${media.provider}. Use EmDash's provider component for external libraries.`,
		);
	}

	const storageKey =
		typeof media.meta?.storageKey === 'string'
			? media.meta.storageKey
			: undefined;

	const raw = storageKey || media.src || media.url;

	if (!raw) {
		throw new TypeError(
			'Image needs a storage key or URL; an EmDash media ID is not a filename.',
		);
	}

	const src = raw.replace(/^\/_emdash\/api\/media\/file\//, '');

	const fp = focalPoint(media.focalX, media.focalY);

	const width =
		options.width ??
		(options.height && media.width && media.height
			? Math.round((options.height * media.width) / media.height)
			: media.width);

	const height =
		options.height ??
		(options.width && media.width && media.height
			? Math.round((options.width * media.height) / media.width)
			: media.height);

	return {
		src,
		width,
		height,
		alt: options.alt ?? media.alt ?? '',
		fit: options.fit,
		smallpics: { ...(fp ? { fp } : {}), ...options.smallpics },
	};
}

export function imageBlockValue(node: ImageBlock): MediaValue {
	const asset = node.asset ?? {};

	return {
		...asset,
		id: asset.id ?? asset._ref,
		src: asset.src ?? asset.url,
		alt: node.alt ?? asset.alt,
		width: node.width ?? asset.width,
		height: node.height ?? asset.height,
		focalX: node.focalX ?? asset.focalX,
		focalY: node.focalY ?? asset.focalY,
	};
}

export function mediaStorageOptions(
	baseUrl: string,
	binding = 'MEDIA',
): { binding: string; publicUrl: string } {
	// Validate using the same configuration as the Astro integration.
	smallpics({ baseUrl });

	return { binding, publicUrl: baseUrl.replace(/\/+$/, '') };
}
