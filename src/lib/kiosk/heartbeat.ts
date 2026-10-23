let lastBeatAt = Date.now();

/** Called by whatever should keep moving, usually the map's frame loop. */
export function beat(): void {
	lastBeatAt = Date.now();
}

/** When the last beat happened, in epoch milliseconds. */
export function lastBeat(): number {
	return lastBeatAt;
}
