/** The map has to stand still this long before the page counts as stuck. */
export const STALL_MS = 2 * 60 * 1000;
/** Two watchdog reloads are never closer than this, so a page that fails on start can't loop. */
export const RELOAD_GUARD_MS = 10 * 60 * 1000;

/** All times are epoch milliseconds. `lastReload` is null when the watchdog has never reloaded. */
export function shouldReloadForStall(
	lastBeat: number,
	now: number,
	lastReload: number | null
): boolean {
	const stalled = now - lastBeat > STALL_MS;
	const guarded = lastReload !== null && now - lastReload < RELOAD_GUARD_MS;
	return stalled && !guarded;
}
