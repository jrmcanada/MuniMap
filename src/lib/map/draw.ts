import { geoPath, type GeoProjection } from 'd3-geo';
import { placeLabel } from './label.js';
import type { MapColors, MapData, PinPoint } from './types.js';

const PIN_RADIUS = 4;
const HIGHLIGHT_RADIUS = 11;
const HIGHLIGHT_BREATH = 2;
const LABEL_SIZE_RATIO = 0.013;
const LABEL_MIN_SIZE = 14;
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
		pinGlow: read('--map-pin-glow'),
		highlight: read('--map-highlight'),
		label: read('--map-label'),
		labelHalo: read('--map-label-halo'),
		fontFamily: style.fontFamily
	};
}

export function readRadarOpacity(element: Element): number {
	return Number(getComputedStyle(element).getPropertyValue('--map-radar-opacity'));
}

/** Draws one radar frame stretched over the canvas, which it was fetched to fit. */
export function drawRadar(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	width: number,
	height: number,
	opacity: number
): void {
	ctx.globalAlpha = opacity;
	ctx.drawImage(image, 0, 0, width, height);
	ctx.globalAlpha = 1;
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

/** Rings the pin the panel is showing and writes its name beside it. */
export function drawHighlight(
	ctx: CanvasRenderingContext2D,
	pin: PinPoint,
	name: string,
	colors: MapColors,
	size: { width: number; height: number },
	seconds: number,
	animate: boolean
): void {
	const breath = animate ? (Math.sin(seconds * 2) + 1) * HIGHLIGHT_BREATH : 0;
	ctx.lineWidth = 2.5;
	ctx.strokeStyle = colors.highlight;
	ctx.beginPath();
	ctx.arc(pin.x, pin.y, HIGHLIGHT_RADIUS + breath, 0, Math.PI * 2);
	ctx.stroke();

	const fontSize = Math.max(LABEL_MIN_SIZE, size.width * LABEL_SIZE_RATIO);
	ctx.font = `600 ${fontSize}px ${colors.fontFamily}`;
	ctx.textBaseline = 'top';
	const box = { width: ctx.measureText(name).width, height: fontSize };
	const spot = placeLabel(pin, box, size.width, size.height);

	ctx.lineJoin = 'round';
	ctx.lineWidth = fontSize / 4;
	ctx.strokeStyle = colors.labelHalo;
	ctx.strokeText(name, spot.x, spot.y);
	ctx.fillStyle = colors.label;
	ctx.fillText(name, spot.x, spot.y);
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
