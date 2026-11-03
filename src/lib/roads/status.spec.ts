import { describe, it, expect } from 'vitest';
import { classifyConditions } from './status.js';

describe('classifyConditions', () => {
	it('sorts the documented examples', () => {
		expect(classifyConditions(['Bare and dry road'])).toBe('clear');
		expect(classifyConditions(['bare and wet road'])).toBe('wet');
		expect(classifyConditions(['snow covered'])).toBe('snow');
		expect(classifyConditions(['Snow packed'])).toBe('snow');
	});

	it('takes the worst of several conditions', () => {
		expect(classifyConditions(['Bare and dry road', 'Snow covered'])).toBe('snow');
		expect(classifyConditions(['Snow packed', 'Icy sections'])).toBe('ice');
		expect(classifyConditions(['Bare and wet road', 'Bare and dry road'])).toBe('wet');
	});

	it('leaves wording it does not know as null, so the road is not drawn', () => {
		expect(classifyConditions(['Construction zone'])).toBeNull();
		expect(classifyConditions([])).toBeNull();
	});
});
