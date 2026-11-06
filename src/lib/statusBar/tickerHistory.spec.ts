import { describe, it, expect } from 'vitest';
import { TickerHistory } from './tickerHistory.js';

const fact = (id: string) => ({ id, text: id });

describe('TickerHistory', () => {
	it('has nothing to step to when empty or on its only fact', () => {
		const history = new TickerHistory();
		expect(history.back()).toBeNull();
		expect(history.forward()).toBeNull();
		history.record(fact('a'));
		expect(history.back()).toBeNull();
		expect(history.forward()).toBeNull();
	});

	it('steps back through earlier facts and forward again, then runs out at the newest', () => {
		const history = new TickerHistory();
		['a', 'b', 'c'].forEach((id) => history.record(fact(id)));
		expect(history.back()?.id).toBe('b');
		expect(history.back()?.id).toBe('a');
		expect(history.back()).toBeNull();
		expect(history.forward()?.id).toBe('b');
		expect(history.forward()?.id).toBe('c');
		expect(history.forward()).toBeNull();
	});

	it('puts a new fact at the end even after stepping back', () => {
		const history = new TickerHistory();
		['a', 'b', 'c'].forEach((id) => history.record(fact(id)));
		history.back();
		history.record(fact('d'));
		expect(history.forward()).toBeNull();
		expect(history.back()?.id).toBe('c');
	});

	it('keeps only the last 30 facts', () => {
		const history = new TickerHistory();
		for (let i = 0; i < 40; i++) history.record(fact(`f${i}`));
		let steps = 0;
		while (history.back()) steps++;
		expect(steps).toBe(29);
	});
});
