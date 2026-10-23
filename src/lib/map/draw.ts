import { geoPath, type GeoProjection } from 'd3-geo';
import type { MapColors, MapData, PinPoint } from './types.js';

const PIN_RADIUS = 4;
const PULSE_SECONDS = 6;
const PULSE_MAX_SCALE = 3;

/** Reads the map palette once from the CSS custom properties in layout.css. */
export function readColors(element: Element): MapColors {
	const style = getComputedStyle(element);
	const read = (name: string) => style.getPropertyValue(name).trim();
	return {
		land: read('--map-land'),
		neighbour: read('--map-neighbour'),
		border: read('--map-border'),
		water: read('--map-water'),
		pin: read('--map-pin'),
		pinGlow: read('--map-pin-glow')
	};
}

export function drawBase(
	ctx: CanvasRenderingContext2D,
	data: MapData,
	projection: GeoProjection,
	colors: MapColors
): void {
	const path = geoPath(projection, ctx);
	ctx.lineWidth = 1;
	ctx.strokeStyle = colors.border;

	for (const feature of data.features) {
		if (feature.properties.kind !== 'region') continue;
		ctx.fillStyle = feature.properties.ontario ? colors.land : colors.neighbour;
		ctx.beginPath();
		path(feature);
		ctx.fill();
		ctx.stroke();
	}

	ctx.fillStyle = colors.water;
	for (const feature of data.features) {
		if (feature.properties.kind !== 'lake') continue;
		ctx.beginPath();
		path(feature);
		ctx.fill();
	}
}

/** Draws every pin. Each one pulses on its own offset so they never beat in sync. */
export function drawPins(
	ctx: CanvasRenderingContext2D,
	pins: PinPoint[],
	colors: MapColors,
	seconds: number,
	pulse: boolean
): void {
	ctx.lineWidth = 1.5;
	pins.forEach((pin, index) => {
		if (pulse) {
			const phase = (seconds / PULSE_SECONDS + index / pins.length) % 1;
			ctx.globalAlpha = 1 - phase;
			ctx.strokeStyle = colors.pinGlow;
			ctx.beginPath();
			ctx.arc(pin.x, pin.y, PIN_RADIUS * (1 + phase * (PULSE_MAX_SCALE - 1)), 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		ctx.fillStyle = colors.pin;
		ctx.beginPath();
		ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	});
}
