import type { RadarFrame } from './frameStore.js';

export const FRAMES_PER_SECOND = 2;
export const HOLD_SECONDS = 2;
/** Radar older than this is hidden, so a dead feed never plays as live. */
export const STALE_MS = 60 * 60 * 1000;

function cycleSeconds(frameCount: number): number {
	return frameCount / FRAMES_PER_SECOND + HOLD_SECONDS;
}

/**
 * Loops the frames at a fixed rate and holds the newest one before restarting. The frame
 * list only changes at a restart, never partway through a lap.
 */
export class RadarPlayer {
	private shown: RadarFrame[] = [];
	private cycleStart = 0;

	/**
	 * @param source current frames, oldest first
	 * @param release called after a new set is adopted, when evicted frames are safe to close
	 */
	constructor(
		private source: () => RadarFrame[],
		private release: () => void
	) {}

	/** Forgets the frames being shown, for when they no longer fit the canvas. */
	reset(): void {
		this.shown = [];
		this.release();
	}

	/** The frame to draw `seconds` into the animation, or null when there is none to show. */
	frameAt(seconds: number, nowMs: number): RadarFrame | null {
		const elapsed = seconds - this.cycleStart;
		if (this.shown.length === 0 || elapsed >= cycleSeconds(this.shown.length)) {
			this.adopt();
			this.cycleStart = seconds;
		}
		if (this.isStale(nowMs)) return null;
		const index = Math.floor((seconds - this.cycleStart) * FRAMES_PER_SECOND);
		return this.shown[Math.min(index, this.shown.length - 1)] ?? null;
	}

	/** The newest frame, for visitors who prefer reduced motion. */
	newestFrame(nowMs: number): RadarFrame | null {
		this.adopt();
		return this.isStale(nowMs) ? null : (this.shown[this.shown.length - 1] ?? null);
	}

	private adopt(): void {
		this.shown = this.source();
		this.release();
	}

	/** Judged by the newest frame, so a loop of older frames still plays while the feed is live. */
	private isStale(nowMs: number): boolean {
		const newest = this.shown[this.shown.length - 1];
		return !newest || nowMs - Date.parse(newest.time) > STALE_MS;
	}
}
