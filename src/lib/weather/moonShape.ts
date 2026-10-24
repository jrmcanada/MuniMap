/**
 * The lit part of the moon as an SVG path on a disc of radius 1 centred on the origin, seen from
 * the northern hemisphere. `phase` is 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter.
 */
export function litMoonPath(phase: number): string {
	const waxing = phase < 0.5;
	const terminator = Math.abs(Math.cos(2 * Math.PI * phase));
	const crescent = phase < 0.25 || phase > 0.75;
	// The waxing moon is lit on its right, the waning moon on its left.
	const limbSweep = waxing ? 1 : 0;
	// A crescent's inner edge bulges the way the limb does; a gibbous moon's bulges the other way.
	const terminatorSweep = crescent === waxing ? 0 : 1;
	return `M0 -1 A1 1 0 0 ${limbSweep} 0 1 A${terminator.toFixed(3)} 1 0 0 ${terminatorSweep} 0 -1Z`;
}
