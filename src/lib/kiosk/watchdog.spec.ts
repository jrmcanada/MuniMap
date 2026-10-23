import { describe, it, expect } from 'vitest';
import { RELOAD_GUARD_MS, shouldReloadForStall, STALL_MS } from './watchdog.js';

const NOW = 1_000_000_000;

describe('shouldReloadForStall', () => {
	it('leaves a page alone while the heartbeat is recent', () => {
		expect(shouldReloadForStall(NOW - 1000, NOW, null)).toBe(false);
		expect(shouldReloadForStall(NOW - STALL_MS, NOW, null)).toBe(false);
	});

	it('reloads once the heartbeat is older than 2 minutes', () => {
		expect(shouldReloadForStall(NOW - STALL_MS - 1, NOW, null)).toBe(true);
	});

	it('does not reload twice within 10 minutes', () => {
		const stalled = NOW - STALL_MS - 1;
		expect(shouldReloadForStall(stalled, NOW, NOW - RELOAD_GUARD_MS + 1)).toBe(false);
		expect(shouldReloadForStall(stalled, NOW, NOW - RELOAD_GUARD_MS)).toBe(true);
	});
});
