import { fetchFrameTimes, RAIN_LAYER, SNOW_LAYER } from './capabilities.js';
import { FrameStore, type RadarFrame } from './frameStore.js';
import { buildGetMapUrl, type Bbox } from './wms.js';

const REFRESH_MS = 6 * 60 * 1000;
/** Retry delays after consecutive failures, then back to the normal refresh. */
const RETRY_MS = [10_000, 30_000, 60_000];
const CONCURRENT_REQUESTS = 6;

/** The canvas size and extent every frame is fetched for. */
export interface RadarView {
	bbox: Bbox;
	width: number;
	height: number;
}

/** GeoMet reports errors as HTTP 200 with XML, so the content type is checked as well. */
async function fetchLayer(
	layer: string,
	time: string,
	view: RadarView,
	signal: AbortSignal
): Promise<ImageBitmap> {
	const response = await fetch(buildGetMapUrl({ layer, time, ...view }), { signal });
	if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
		throw new Error(`${layer} ${time} failed`);
	}
	return createImageBitmap(await response.blob());
}

/** One frame is rain and snow drawn together, as GeoMet allows one layer per request. */
async function loadFrame(
	time: string,
	view: RadarView,
	signal: AbortSignal
): Promise<ImageBitmap | null> {
	const layers = await Promise.allSettled(
		[RAIN_LAYER, SNOW_LAYER].map((layer) => fetchLayer(layer, time, view, signal))
	);
	const images = layers.flatMap((layer) => (layer.status === 'fulfilled' ? [layer.value] : []));
	if (images.length === 0) return null;

	const canvas = new OffscreenCanvas(view.width, view.height);
	const ctx = canvas.getContext('2d')!;
	for (const image of images) {
		ctx.drawImage(image, 0, 0);
		image.close();
	}
	return canvas.transferToImageBitmap();
}

async function runLimited<T>(
	items: string[],
	limit: number,
	work: (item: string) => Promise<T>
): Promise<T[]> {
	const results: T[] = [];
	let next = 0;
	const worker = async () => {
		while (next < items.length) results.push(await work(items[next++]));
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/**
 * Keeps the last 3 hours of radar frames current. Fetches only frames it doesn't hold,
 * newest first, and never throws: failures are retried and the old frames stay.
 */
export class RadarFeed {
	private store = new FrameStore();
	private abort: AbortController | null = null;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private failures = 0;

	/** @param onChange called whenever a frame is added */
	constructor(private onChange: () => void) {}

	frames(): RadarFrame[] {
		return this.store.snapshot();
	}

	releaseRetired(): void {
		this.store.releaseRetired();
	}

	/** Starts for a canvas size. Frames for any earlier size are discarded. */
	start(view: RadarView): void {
		this.stop();
		const abort = new AbortController();
		this.abort = abort;
		this.failures = 0;
		void this.refresh(view, abort.signal);
	}

	/** Stops fetching and retires the frames. The player must reset before they are released. */
	stop(): void {
		this.abort?.abort();
		this.abort = null;
		clearTimeout(this.timer);
		this.store.clear();
	}

	dispose(): void {
		this.stop();
		this.store.dispose();
	}

	private async refresh(view: RadarView, signal: AbortSignal): Promise<void> {
		let succeeded = false;
		try {
			const times = await fetchFrameTimes(signal);
			this.store.keepOnly(times);
			const missing = times.filter((time) => !this.store.has(time)).reverse();
			const loaded = await runLimited(missing, CONCURRENT_REQUESTS, async (time) => {
				const image = await loadFrame(time, view, signal);
				if (!image) return false;
				if (signal.aborted) {
					image.close();
					return false;
				}
				this.store.add(time, image);
				this.onChange();
				return true;
			});
			succeeded = missing.length === 0 || loaded.some(Boolean);
		} catch {
			// Network or parse failure: keep the frames we have and retry below.
		}
		if (signal.aborted) return;

		this.failures = succeeded ? 0 : this.failures + 1;
		const delay = succeeded ? REFRESH_MS : (RETRY_MS[this.failures - 1] ?? REFRESH_MS);
		this.timer = setTimeout(() => void this.refresh(view, signal), delay);
	}
}
