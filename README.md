# Small Pics for EmDash

Add [Small Pics](https://www.smallpics.io) image CDN and transforms to EmDash.

## Installation

```sh
npm install emdash-smallpics
```

## Configuration

Register the integration in `astro.config.mjs`.

A source `baseUrl` is required.

### Configuration parameters

| Parameter       | Type                            | Required                                                                  | Default                | Description                                                                |
| --------------- | ------------------------------- | ------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `baseUrl`       | String                          | When `sources` is omitted                                                 | None                   | Delivery URL for the shorthand source named `default`.                     |
| `sources`       | Record of source configurations | No                                                                        | Derived from `baseUrl` | Named origins. When supplied, must be nonempty and replaces the shorthand. |
| `defaultSource` | String                          | For relative paths with multiple sources unless an image selects `source` | Only configured source | Source name for relative paths. Absolute URLs use prefix matching.         |
| `defaultParams` | Transform options               | No                                                                        | `{}`                   | Global defaults applied before source and image parameters.                |

### Source configuration

| Parameter       | Type              | Required                                    | Default | Description                                                                         |
| --------------- | ----------------- | ------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `baseUrl`       | String            | Yes                                         | None    | Absolute HTTP or HTTPS Small Pics delivery URL, optionally including a directory.   |
| `originUrl`     | String            | No                                          | None    | Original URL prefix to match and remove before generating a delivery URL.           |
| `secret`        | String            | When the Small Pics origin requires signing | None    | Server-side signing secret.                                                         |
| `defaultParams` | Transform options | No                                          | `{}`    | Source defaults applied after global defaults.                                      |
| `transformSvgs` | Boolean           | No                                          | `false` | If false, SVG requests receive `passthrough=1`, overriding a per-image false value. |

For signing or SVG settings, use an entry in `sources`, even with a single origin. `secret` and `transformSvgs` are source options, not top-level options.

### Single Source

```js
import { defineConfig } from 'astro/config';
import smallpics from 'emdash-smallpics';

export default defineConfig({
	integrations: [
		smallpics({
			sources: {
				default: {
					baseUrl: 'https://my-source.smallpics.io',
					secret: process.env.SMALLPICS_SECRET,
					transformSvgs: false,
				},
			},
			defaultParams: { q: 65 },
		}),
	],
});
```

### Multiple Sources

Use source labels to select the source setup for an image. The label is only used by the integration and is not added to generated URLs.

See an example of selecting a source in [Select a Source](#select-a-source) below.

```js
import { defineConfig } from 'astro/config';
import smallpics from 'emdash-smallpics';

export default defineConfig({
	integrations: [
		smallpics({
			defaultSource: 'productImages',
			sources: {
				productImages: {
					baseUrl: 'https://product-images.smallpics.io',
					secret: process.env.SMALLPICS_PRODUCTS_SECRET,
					transformSvgs: false,
					defaultParams: { q: 80 },
				},
				editorialImages: {
					baseUrl: 'https://editorial-images.smallpics.io',
					secret: process.env.SMALLPICS_EDITORIAL_SECRET,
					transformSvgs: false,
				},
			},
		}),
	],
});
```

### Parameter Precedence

Later values override earlier values.

- Global `defaultParams`, source `defaultParams`, native image properties, then per-image `smallpics` parameters.
- Native image dimensions take precedence so responsive descriptors match their generated variants.
- `transformSvgs: false` adds `passthrough=1` for SVGs, overriding `passthrough: false`.

### Media Storage

Keep the site's existing EmDash database, storage, React integration, and runtime adapter. Add Small Pics after EmDash and set `images: false` in EmDash to disable its image endpoint wrapper.

This excerpt shows a Cloudflare site with existing D1 and R2 bindings:

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';
import smallpics, { mediaStorageOptions } from 'emdash-smallpics';

const baseUrl = 'https://media.smallpics.io';

export default defineConfig({
	output: 'server',
	adapter: cloudflare(),
	integrations: [
		react(),
		emdash({
			database: d1({ binding: 'DB' }),
			storage: r2(mediaStorageOptions(baseUrl, 'MEDIA')),
			images: false,
		}),
		smallpics({ baseUrl }),
	],
});
```

Configure the matching image origin in Small Pics to read the same bucket and object paths that EmDash uploads. Setting `publicUrl` only changes generated URLs; it does not configure the origin or move files. Existing assets must remain available at their current paths. Use a separate delivery source for a different bucket.

## Native EmDash Transforms

The integration configures Astro's image service. Native `Image`, `Picture`, and `getImage()` calls generate Small Pics URLs.

The original must exist in the configured Small Pics origin. Imported local Astro assets are not uploaded automatically. Match existing origin URLs with a source's `originUrl`; unknown absolute URLs are rejected.

Register Small Pics after EmDash and set `images: false` in EmDash. This disables EmDash's image endpoint wrapper. Use the supplied image and rich-text components to forward saved focal points to Small Pics.

### Native Transform Key Mapping

Native image properties are translated to Small Pics parameters:

| Image property | Small Pics parameter                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| `width`        | `w`                                                                                       |
| `height`       | `h`                                                                                       |
| `quality`      | `q`                                                                                       |
| `format`       | `fm`                                                                                      |
| `fit`          | `fit`; cover becomes crop, fill becomes stretch, inside becomes max, outside becomes crop |
| `position`     | Percentage coordinates in `fp`                                                            |
| `background`   | `bg`                                                                                      |

## Templates

The URL examples below assume the source has no default transform parameters.

### Transform an Image

```astro
---
import Image from 'emdash-smallpics/Image';
const { post } = Astro.props;
---

<Image
	image={post.data.featured_image}
	width={800}
	height={600}
	fit="cover"
	quality={80}
	alt="Bird"
/>
```

The image's `src` uses the configured delivery domain:

```html
https://my-source.smallpics.io/bird.jpg?fit=crop&h=600&q=80&w=800
```

### Select a Source

Select a source with `source`.

```astro
---
import Image from 'emdash-smallpics/Image';
const { post } = Astro.props;
---

<Image
	image={post.data.featured_image}
	source="editorialImages"
	width={1200}
	height={900}
	alt="Bird"
/>
```

With the multiple-source configuration above, this uses `https://editorial-images.smallpics.io`.

### Set an Output Format

For format selection, see the note in [Transform Options](#transform-options).[^format-selection]

```astro
---
import Image from 'emdash-smallpics/Image';
const { post } = Astro.props;
---

<Image
	image={post.data.featured_image}
	width={1200}
	height={900}
	format="avif"
	alt="Bird"
/>
```

### Create a Srcset

Pass `widths` to generate responsive image variants.

```astro
---
import Image from 'emdash-smallpics/Image';
const { post } = Astro.props;
---

<Image
	image={post.data.featured_image}
	width={800}
	height={600}
	widths={[400, 800]}
	fit="cover"
	alt="Bird"
/>
```

The generated `srcset` contains:

```html
https://my-source.smallpics.io/bird.jpg?fit=crop&h=300&w=400 400w,
https://my-source.smallpics.io/bird.jpg?fit=crop&h=600&w=800 800w
```

The component also supplies a fallback `src`.

### Render Rich Text

```astro
---
import PortableText from 'emdash-smallpics/PortableText';
const { post } = Astro.props;
---

<PortableText value={post.data.content} />
```

The wrapper supplies image and gallery renderers. Custom `components.type` entries override them. Editors continue uploading and selecting images in EmDash.

## Transform Options

All the transform options supported by the Small Pics transform API are supported by this integration. Take a look at the [Small Pics docs](https://www.smallpics.io/docs/) for more detailed information about each parameter.

Transform options can use either the Small Pics URL param key or the option name used by `smallpics-js`. For example, `q` and `quality` are equivalent.

Pass these options through `smallpics` on an image or through global and source `defaultParams`.

Use a single value for options that accept a single argument:

```js
({
	w: 800,
	q: 80,
});
```

Use an array for options that accept multiple arguments:

```js
({
	crop: [400, 300, 10, 20],
	ar: [16, 9],
	border: [8, 'ffffff', 'expand'],
	fit: 'crop',
	fp: '50w:0h',
});
```

| Query parameter | Plugin option name      | Accepted values                                                                                | Example                           |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| `or`            | `orientation`           | `0`, `90`, `180`, `270`, or `auto`                                                             | `or: 'auto'`                      |
| `flip`          | `flip`                  | `v`, `h`, or `both`                                                                            | `flip: 'h'`                       |
| `crop`          | `crop`                  | Named anchor, `entropy`, `face[,fallback]`, `facesarea[,fallback]`, or `[width, height, x, y]` | `crop: [400, 300, 10, 20]`        |
| `w`             | `width`                 | Integer or decimal pixels, or relative dimensions                                              | `w: '65p'`                        |
| `h`             | `height`                | Integer or decimal pixels, or relative dimensions                                              | `h: '50w'`                        |
| `ar`            | `aspectRatio`           | `width:height`, decimal ratio, or `[dividend, divisor]`                                        | `ar: '16:9'`                      |
| `fit`           | `fit`                   | `contain`, `max`, `fill`, `fill-max`, `stretch`, or `crop`                                     | `fit: 'crop'`                     |
| `dpr`           | `devicePixelRatio`      | Integer or decimal                                                                             | `dpr: 1.5`                        |
| `bri`           | `brightness`            | Integer brightness                                                                             | `bri: 10`                         |
| `con`           | `contrast`              | Integer contrast                                                                               | `con: 15`                         |
| `gam`           | `gamma`                 | Float gamma                                                                                    | `gam: 1.2`                        |
| `sharp`         | `sharpen`               | Integer sharpen amount                                                                         | `sharp: 20`                       |
| `blur`          | `blur`                  | Integer blur amount                                                                            | `blur: 5`                         |
| `pixel`         | `pixelate`              | Integer pixelate amount                                                                        | `pixel: 8`                        |
| `filt`          | `filter`                | `grayscale` or `sepia`                                                                         | `filt: 'grayscale'`               |
| `mark`          | `watermarkPath`         | Watermark image path                                                                           | `mark: '/watermark.png'`          |
| `markorigin`    | `watermarkOrigin`       | Watermark origin name                                                                          | `markorigin: 'default'`           |
| `markw`         | `watermarkWidth`        | Integer, decimal, or relative width                                                            | `markw: '20w'`                    |
| `markh`         | `watermarkHeight`       | Integer, decimal, or relative height                                                           | `markh: '20h'`                    |
| `markfit`       | `watermarkFit`          | `contain`, `max`, `fill`, `fill-max`, `stretch`, or `crop`                                     | `markfit: 'contain'`              |
| `markfp`        | `watermarkFocalPoint`   | Pixels, relative values, or `x:y` within the watermark                                         | `markfp: '20p:20p'`               |
| `markzoom`      | `watermarkZoom`         | Numeric zoom from `1` to `100`                                                                 | `markzoom: 2`                     |
| `markpad`       | `watermarkPadding`      | Pixels, relative values, or `x:y`                                                              | `markpad: '10:20'`                |
| `markpos`       | `watermarkPosition`     | Named anchor, numeric coordinate, or pixel/relative `x:y` string                               | `markpos: '25p:50p'`              |
| `markalpha`     | `watermarkAlpha`        | Integer alpha                                                                                  | `markalpha: 80`                   |
| `bg`            | `background`            | Background color                                                                               | `bg: 'ffffff'`                    |
| `border`        | `border`                | `[width, color, method]`; method is `overlay`, `shrink`, or `expand`                           | `border: [8, 'ffffff', 'expand']` |
| `trim`          | `trim`                  | `auto`, `color`, `alpha`, or `either`                                                          | `trim: 'color'`                   |
| `trim-color`    | `trimColor`             | Color to remove                                                                                | `'trim-color': 'ffffff'`          |
| `trim-alpha`    | `trimAlpha`             | Alpha threshold, 0 to 255                                                                      | `'trim-alpha': 8`                 |
| `trim-tol`      | `trimTolerance`         | Tolerance, 0 to 255                                                                            | `'trim-tol': 8`                   |
| `trim-pad`      | `trimPadding`           | Padding in pixels or relative values[^relative-values]                                         | `'trim-pad': 8`                   |
| `trim-md`       | `trimMeanDifference`    | Auto mean difference, 0 to 255                                                                 | `'trim-md': 8`                    |
| `trim-sd`       | `trimStandardDeviation` | Auto standard deviation, 0 to 255                                                              | `'trim-sd': 8`                    |
| `q`             | `quality`               | Integer quality                                                                                | `q: 80`                           |
| `fm`            | `format`                | `strict`, `auto`, `jpg`, `jpeg`, `pjpg`, `png`, `gif`, `webp`, `avif`, or `jxl` [^format-selection]              | `fm: 'avif'`                      |
| `interlace`     | `interlaced`            | Boolean                                                                                        | `interlace: true`                 |
| `fp`            | `focalPoint`            | Pixels or relative x/y                                                                         | `fp: '25w:75h'`                   |
| `zoom`          | `zoom`                  | Numeric, `face`, `facesarea`, optional numeric fallback                                        | `zoom: 'face,2.5'`                |
| `zoompad`       | `zoomPadding`           | Pixels or relative x/y                                                                         | `zoompad: '10:20'`                |
| `face`          | `face`                  | One-based face index                                                                           | `face: 1`                         |
| `debug`         | `debug`                 | Boolean                                                                                        | `debug: true`                     |
| `passthrough`   | `passthrough`           | Boolean; false removes the flag unless `transformSvgs` is false                                | `passthrough: true`               |

Dimensions accept decimal pixels and `p`, `w`, or `h` units.[^relative-values] Paired values accept serialized `x:y` strings.

```astro
---
import { Image } from 'astro:assets';
---

<Image
	src="bird.jpg"
	width={800}
	height={600}
	alt="Bird"
	smallpics={{
		fit: 'crop',
		crop: 'face,top',
		zoom: 'face,2.5',
		zoompad: '5p:10p',
	}}
/>
```

[^format-selection]: **Format selection.** Omitting `fm` or `format` uses `strict`. With `fm=strict`, a missing or catch-all `Accept` header (`*/*` or `image/*`) preserves the source format. A specific `Accept` header selects the output format. `fm=auto` always selects a format from `Accept`, falling back to AVIF. GIF inputs use WebP in auto mode, which supports animation.

[^relative-values]: **Relative values.** Use a percentage from 0 to 100 followed by `w` for width, `h` for height, or `p` for the relevant axis. For example, `5w` means 5% of the base image's width, and `35h` means 35% of its height.

## JavaScript

Use `getImage()` in Astro server code to access generated URLs and responsive variants.

```js
import { getImage } from 'astro:assets';

const image = await getImage({
	src: 'bird.jpg',
	width: 800,
	height: 600,
	fit: 'cover',
	widths: [400, 800],
});

const url = image.src;
const srcset = image.srcSet.attribute;
```

## Reference

### Image Result

`getImage()` returns the image URL, HTML attributes, and responsive variants.

```js
const url = image.src;
const attributes = image.attributes;
const srcset = image.srcSet.attribute;
const variants = image.srcSet.values;
```

### Image properties

| Property                             | Type / accepted values                          | Default                                               | Description                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `image`                              | Media value, string, null, undefined            | Required                                              | Field value or origin path. Null and undefined render nothing.                                                                                |
| `width`, `height`                    | Positive numbers                                | Media dimensions                                      | Override display dimensions. One override preserves the media aspect ratio. Both dimensions must resolve.                                     |
| `widths`                             | Positive integer array                          | Generated candidates                                  | Defaults include 320, 640, 960, 1280, 1600, 1920 plus display width and cap, capped at the smaller of twice display width and original width. |
| `sizes`                              | String                                          | Display width above its breakpoint, otherwise `100vw` | Browser responsive-image sizing.                                                                                                              |
| `source`                             | String                                          | Integration source resolution                         | Selects a named delivery source.                                                                                                              |
| `fit`                                | `cover`, `contain`, `fill`, `inside`, `outside` | Inherited source/global fit                           | Maps to crop, contain, stretch, max, crop respectively.                                                                                       |
| `format`                             | `avif`, `webp`, `jpg`, `png`, `gif`             | Inherited format                                      | Output format. Other native formats can be passed in `smallpics`.                                                                             |
| `quality`                            | Number 0–100                                    | Inherited quality                                     | Output quality.                                                                                                                               |
| `smallpics`                          | Transform options                               | Saved focal point when present                        | Explicit values override saved focal-point metadata and other transform defaults.                                                             |
| `alt`                                | String                                          | Media alt or empty string                             | Explicit empty strings are preserved.                                                                                                         |
| `darkVariant`                        | Media value, string, null                       | Media's dark variant                                  | Alternate image for dark mode. Null falls back to the media value.                                                                            |
| `priority`                           | Boolean                                         | `false`                                               | Defaults to eager loading and high fetch priority when true.                                                                                  |
| `loading`                            | `lazy`, `eager`                                 | `lazy`, or `eager` with priority                      | Explicit value overrides the priority default.                                                                                                |
| `decoding`                           | `async`, `sync`, `auto`                         | `async`                                               | HTML decoding attribute.                                                                                                                      |
| `fetchpriority`                      | `high`, `low`, `auto`                           | `high` with priority, otherwise omitted               | Explicit value overrides the priority default.                                                                                                |
| `id`, `class`, other HTML attributes | HTML attribute values                           | Omitted                                               | Applied to each variant. Dark variant IDs receive a `--dark` suffix.                                                                          |

### Media value fields

| Field              | Type                  | Resolution behavior                                                                     |
| ------------------ | --------------------- | --------------------------------------------------------------------------------------- |
| `meta.storageKey`  | String                | First choice for the source path.                                                       |
| `src`              | String                | Used when the storage key is absent or empty.                                           |
| `url`              | String                | Used when both storage key and src are absent or empty.                                 |
| `id`               | String                | Identifier only; never treated as a storage path.                                       |
| `provider`         | String                | Absent or `local` supported; other providers rejected.                                  |
| `width`, `height`  | Numbers               | Original dimensions used for sizing and responsive limits.                              |
| `alt`              | String                | Default alternative text.                                                               |
| `focalX`, `focalY` | Numbers 0–1 or null   | Both coordinates must be present and valid, or both absent. Convert to percentage `fp`. |
| `darkVariant`      | Media value or string | Optional alternate image.                                                               |
| `dominantColor`    | String                | Accepted in media values but not rendered by this adapter.                              |

### Rich-text and gallery fields

| Field                                                    | Type / default                            | Behavior                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| PortableText `value`                                     | EmDash rich-text value                    | Passed to EmDash PortableText.                                                                            |
| PortableText `components.type`                           | Component map                             | Caller entries override the adapter's image and gallery renderers. Other PortableText props pass through. |
| Gallery `node.images`                                    | Image-block array, required               | Image blocks rendered in order.                                                                           |
| Gallery `node.columns`                                   | Integer 1–12, default 3                   | Desktop columns; two columns at widths up to 640px.                                                       |
| Gallery `sizes`                                          | String, optional                          | Defaults to `50vw` below 640px, otherwise `100 / columns` vw.                                             |
| Image block `asset`                                      | Media value with optional `_ref`          | Must contain a storage key or URL; `_ref` alone is insufficient.                                          |
| Image block `alt`, `width`, `height`, `focalX`, `focalY` | Media metadata                            | Block values override asset metadata when present.                                                        |
| Image block `displayWidth`, `displayHeight`              | Numbers, optional                         | Override rendered dimensions.                                                                             |
| Image block `caption`, `title`                           | Strings, optional                         | Caption appears in figcaption; title passes to the image.                                                 |
| Image block `alignment`                                  | `left`, `center`, `right`, `wide`, `full` | Controls figure alignment.                                                                                |
| Image block `link`                                       | String or `{ href, blank? }`              | Supports HTTP(S), root-relative paths, and fragments. Other protocols are omitted.                        |

### Helpers

| Export                                   | Behavior                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| Default export                           | Reuses the Astro Small Pics integration and its source configuration              |
| `resolveImage(image, options?)`          | Resolves a field to a path, dimensions, alt text, and transform metadata          |
| `imageBlockValue(node)`                  | Converts a rich-text reference or seeded media value into a field value           |
| `focalPoint(x, y)`                       | Converts normalized coordinates to a Small Pics focal-point value                 |
| `mediaStorageOptions(baseUrl, binding?)` | Returns R2 storage configuration with a delivery URL; binding defaults to `MEDIA` |

### Media Support

The supplied components support EmDash's storage-backed media. External media-provider entries are rejected; retain the provider's component for those assets. Admin asset editing and inline editing use EmDash's own UI. The adapter does not rewrite all admin thumbnails, replace media storage, or purge Small Pics caches when an object is replaced. Prefer new object keys for changed originals or use the existing Small Pics cache invalidation workflow.

This version preserves alt text and captions but does not render EmDash blurhash placeholders. SVGs use the Astro integration's passthrough behavior.

### SVG passthrough

`transformSvgs` defaults to `false`. When false, and the image is an SVG, Small Pics will proxy the SVG to the client without applying any transforms, so that it can be cached the same as other transformed images.

This setting takes precedence over `passthrough: false` in transform parameters.

```js
const config = {
	sources: {
		default: {
			baseUrl: 'https://images.example.com',
			transformSvgs: false, // Default: adds passthrough=1.
		},
	},
};
```
