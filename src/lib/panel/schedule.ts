/**
 * Which slot of the rotation the panel is on, and whether a visitor has pinned a
 * municipality. It runs on whatever monotonic clock the caller passes in, so clock changes
 * and daylight saving never skip or repeat a municipality.
 */
export class PanelSchedule {
	slot = 0;
	/** The municipality a visitor picked, or null while the rotation is in charge. */
	pinnedName: string | null = null;

	private startedAt: number;
	private pinnedUntil = 0;

	constructor(
		private slotMs: number,
		private holdMs: number,
		now: number
	) {
		this.startedAt = now;
	}

	/** Shows a municipality for the hold time, whatever the rotation was doing. */
	pin(name: string, now: number): void {
		this.pinnedName = name;
		this.pinnedUntil = now + this.holdMs;
	}

	/**
	 * Moves to `now`. When a hold ends, the rotation resumes with the next municipality in its
	 * order and gives it a full slot.
	 */
	tick(now: number): void {
		if (this.pinnedName) {
			if (now < this.pinnedUntil) return;
			this.pinnedName = null;
			this.slot += 1;
			this.startedAt = now - this.slot * this.slotMs;
			return;
		}
		this.slot = Math.floor((now - this.startedAt) / this.slotMs);
	}
}
