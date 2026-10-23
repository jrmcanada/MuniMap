export interface RadarFrame {
	time: string;
	image: ImageBitmap;
}

/**
 * Decoded radar frames keyed by timestamp. A frame that leaves the window is not closed
 * at once, because the player may still be drawing it; `releaseRetired` closes them once
 * the player has moved on to a newer set.
 */
export class FrameStore {
	private frames = new Map<string, ImageBitmap>();
	private retired: ImageBitmap[] = [];

	has(time: string): boolean {
		return this.frames.has(time);
	}

	add(time: string, image: ImageBitmap): void {
		this.frames.set(time, image);
	}

	/** Drops every frame whose time is not in `times`. */
	keepOnly(times: string[]): void {
		const wanted = new Set(times);
		for (const [time, image] of this.frames) {
			if (wanted.has(time)) continue;
			this.frames.delete(time);
			this.retired.push(image);
		}
	}

	clear(): void {
		this.keepOnly([]);
	}

	/** Frames oldest first. */
	snapshot(): RadarFrame[] {
		return [...this.frames]
			.map(([time, image]) => ({ time, image }))
			.sort((a, b) => a.time.localeCompare(b.time));
	}

	releaseRetired(): void {
		for (const image of this.retired) image.close();
		this.retired = [];
	}

	/** Closes everything. Only call once nothing is drawing from the store. */
	dispose(): void {
		this.clear();
		this.releaseRetired();
	}
}
