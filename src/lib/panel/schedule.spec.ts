import { describe, it, expect } from 'vitest';
import { PanelSchedule } from './schedule.js';

const SLOT = 20_000;
const HOLD = 60_000;

describe('PanelSchedule', () => {
	it('moves to the next slot every 20 seconds', () => {
		const schedule = new PanelSchedule(SLOT, HOLD, 1000);
		schedule.tick(1000 + 19_999);
		expect(schedule.slot).toBe(0);
		schedule.tick(1000 + 20_000);
		expect(schedule.slot).toBe(1);
	});

	it('jumps to the right slot after a long gap, such as a hidden tab', () => {
		const schedule = new PanelSchedule(SLOT, HOLD, 0);
		schedule.tick(5 * SLOT + 1);
		expect(schedule.slot).toBe(5);
	});

	it('holds a pinned municipality for a minute and keeps the slot still', () => {
		const schedule = new PanelSchedule(SLOT, HOLD, 0);
		schedule.tick(30_000);
		schedule.pin('Wawa', 30_000);
		schedule.tick(30_000 + 59_999);
		expect(schedule.pinnedName).toBe('Wawa');
		expect(schedule.slot).toBe(1);
	});

	it('extends the hold when another municipality is picked', () => {
		const schedule = new PanelSchedule(SLOT, HOLD, 0);
		schedule.pin('Wawa', 0);
		schedule.pin('Espanola', 50_000);
		schedule.tick(100_000);
		expect(schedule.pinnedName).toBe('Espanola');
	});

	it('resumes with the next municipality and gives it a full slot', () => {
		const schedule = new PanelSchedule(SLOT, HOLD, 0);
		schedule.tick(30_000);
		schedule.pin('Wawa', 30_000);
		schedule.tick(90_000);
		expect(schedule.pinnedName).toBeNull();
		expect(schedule.slot).toBe(2);

		schedule.tick(90_000 + 19_999);
		expect(schedule.slot).toBe(2);
		schedule.tick(90_000 + 20_000);
		expect(schedule.slot).toBe(3);
	});
});
