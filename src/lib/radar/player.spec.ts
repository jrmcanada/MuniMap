import { describe, it, expect, vi } from 'vitest';
import type { RadarFrame } from './frameStore.js';
import { RadarPlayer, STALE_MS } from './player.js';

const NOW = Date.parse('2026-10-23T03:00:00Z');
const frame = (time: string): RadarFrame => ({ time, image: {} as ImageBitmap });
const frames = [
	frame('2026-10-23T02:42:00Z'),
	frame('2026-10-23T02:48:00Z'),
	frame('2026-10-23T02:54:00Z')
];

describe('RadarPlayer', () => {
	it('steps through the frames at 2 per second, then holds the newest', () => {
		const player = new RadarPlayer(
			() => frames,
			() => {}
		);
		expect(player.frameAt(10, NOW)).toBe(frames[0]);
		expect(player.frameAt(10.5, NOW)).toBe(frames[1]);
		expect(player.frameAt(11, NOW)).toBe(frames[2]);
		expect(player.frameAt(12.9, NOW)).toBe(frames[2]);
	});

	it('picks up new frames only when a lap restarts', () => {
		let current = frames;
		const player = new RadarPlayer(
			() => current,
			() => {}
		);
		player.frameAt(0, NOW);
		current = [...frames, frame('2026-10-23T03:00:00Z')];
		// Lap is 3 / 2 + 2 = 3.5 s; mid lap the old list keeps playing.
		expect(player.frameAt(1.5, NOW)).toBe(frames[2]);
		// At the restart the new list is adopted.
		expect(player.frameAt(3.5, NOW)).toBe(current[0]);
	});

	it('releases retired frames each time it adopts a set', () => {
		const release = vi.fn();
		const player = new RadarPlayer(() => frames, release);
		player.frameAt(0, NOW);
		expect(release).toHaveBeenCalled();
	});

	it('shows nothing before any frame arrives', () => {
		const player = new RadarPlayer(
			() => [],
			() => {}
		);
		expect(player.frameAt(0, NOW)).toBeNull();
	});

	it('plays older frames while the newest is fresh', () => {
		const player = new RadarPlayer(
			() => [frame('2026-10-22T23:00:00Z'), frame('2026-10-23T02:54:00Z')],
			() => {}
		);
		expect(player.frameAt(0, NOW)?.time).toBe('2026-10-22T23:00:00Z');
	});

	it('hides radar that is more than an hour old', () => {
		const player = new RadarPlayer(
			() => frames,
			() => {}
		);
		expect(player.newestFrame(Date.parse(frames[2].time) + STALE_MS + 1)).toBeNull();
		expect(player.newestFrame(NOW)).toBe(frames[2]);
	});
});
