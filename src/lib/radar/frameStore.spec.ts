import { describe, it, expect, vi } from 'vitest';
import { FrameStore } from './frameStore.js';

const fakeImage = () => ({ close: vi.fn() }) as unknown as ImageBitmap & { close: () => void };

describe('FrameStore', () => {
	it('lists frames oldest first', () => {
		const store = new FrameStore();
		store.add('2026-10-23T00:06:00Z', fakeImage());
		store.add('2026-10-23T00:00:00Z', fakeImage());
		expect(store.snapshot().map((frame) => frame.time)).toEqual([
			'2026-10-23T00:00:00Z',
			'2026-10-23T00:06:00Z'
		]);
	});

	it('closes dropped frames only once they are released', () => {
		const store = new FrameStore();
		const old = fakeImage();
		store.add('2026-10-23T00:00:00Z', old);
		store.add('2026-10-23T00:06:00Z', fakeImage());

		store.keepOnly(['2026-10-23T00:06:00Z']);
		expect(store.has('2026-10-23T00:00:00Z')).toBe(false);
		expect(old.close).not.toHaveBeenCalled();

		store.releaseRetired();
		expect(old.close).toHaveBeenCalledOnce();
	});

	it('closes everything on dispose', () => {
		const store = new FrameStore();
		const image = fakeImage();
		store.add('2026-10-23T00:00:00Z', image);
		store.dispose();
		expect(image.close).toHaveBeenCalledOnce();
	});
});
