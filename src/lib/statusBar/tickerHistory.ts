import type { TickerFact } from './facts.js';

/** How many shown facts are kept for stepping back. */
const MAX_FACTS = 30;

/**
 * The facts the ticker has shown, so the viewer can step back to an earlier one and forward again.
 * The cursor sits on the fact on screen. Stepping forward past the newest returns null, which means
 * the ticker should pick a new fact and `record` it.
 */
export class TickerHistory {
	#facts: TickerFact[] = [];
	#cursor = -1;

	/** Adds a newly chosen fact to the end and puts the cursor on it. */
	record(fact: TickerFact): void {
		this.#facts.push(fact);
		if (this.#facts.length > MAX_FACTS) this.#facts.shift();
		this.#cursor = this.#facts.length - 1;
	}

	/** The fact before the one on screen, or null when this is the oldest kept. */
	back(): TickerFact | null {
		if (this.#cursor <= 0) return null;
		this.#cursor--;
		return this.#facts[this.#cursor];
	}

	/** The fact after the one on screen, or null when this is the newest. */
	forward(): TickerFact | null {
		if (this.#cursor < 0 || this.#cursor >= this.#facts.length - 1) return null;
		this.#cursor++;
		return this.#facts[this.#cursor];
	}
}
