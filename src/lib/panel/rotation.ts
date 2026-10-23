/**
 * Shuffled order of names, one lap at a time. Each lap is reshuffled, and a lap never
 * starts with the name that ended the one before.
 */
export class Rotation {
	private laps = new Map<number, string[]>();

	constructor(
		private names: string[],
		private random: () => number = Math.random
	) {}

	/** The name at a position counted from the start of the first lap. */
	at(position: number): string {
		const lap = Math.floor(position / this.names.length);
		return this.lap(lap)[position % this.names.length];
	}

	private lap(index: number): string[] {
		const known = this.laps.get(index);
		if (known) return known;

		const previous = index > 0 ? this.lap(index - 1) : null;
		const order = this.shuffled();
		if (previous && order.length > 1 && order[0] === previous[previous.length - 1]) {
			order.push(order.shift()!);
		}
		this.laps.set(index, order);
		this.laps.delete(index - 2);
		return order;
	}

	private shuffled(): string[] {
		const order = [...this.names];
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(this.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		return order;
	}
}
