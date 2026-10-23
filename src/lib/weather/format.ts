/** "6°", or "−3°" with a true minus sign. A reading that rounds to zero is "0°". */
export function formatDegrees(celsius: number): string {
	const rounded = Math.round(celsius) + 0; // adding 0 turns -0 into 0
	return `${rounded < 0 ? '−' : ''}${Math.abs(rounded)}°`;
}
