import { geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import { EVENT_KINDS, type RoadEvent, type RoadEventKind } from '#lib/roads/events.js';
import type { RoadSegment } from '#lib/roads/roadConditions.js';
import { ROAD_STATUSES } from '#lib/roads/status.js';
import { placeLabel } from './label.js';
import type { HighwayData, MapColors, MapData, PinPoint } from './types.js';

const ROAD_LINE_WIDTH = 2.5;
const EVENT_RADIUS = 7;
const ROADWORK_RADIUS = 5.5;
const PIN_RADIUS = 4;
const OFFICE_RADIUS = 9;
const HIGHLIGHT_RADIUS = 11;
const HIGHLIGHT_BREATH = 2;
const HIGHLIGHT_LINE_WIDTH = 2.5;
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
		highway: read('--map-highway'),
		roads: {
			clear: read('--road-clear'),
			wet: read('--road-wet'),
			snow: read('--road-snow'),
			ice: read('--road-ice')
		},
		roadEvents: {
			closure: read('--road-closed'),
			collision: read('--road-collision'),
			roadwork: read('--road-roadwork')
		},
		office: read('--map-office'),
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
	highways: HighwayData,
	projection: GeoProjection,
	colors: MapColors,
	roads: RoadSegment[] = []
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

	ctx.lineWidth = 1.25;
	ctx.strokeStyle = colors.highway;
	ctx.beginPath();
	for (const feature of highways.features) path(feature);
	ctx.stroke();

	drawRoadConditions(ctx, roads, path, colors);
}

/** Draws each condition's roads over the plain highways, one stroke per status. */
function drawRoadConditions(
	ctx: CanvasRenderingContext2D,
	roads: RoadSegment[],
	path: GeoPath,
	colors: MapColors
): void {
	ctx.lineWidth = ROAD_LINE_WIDTH;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (const status of ROAD_STATUSES) {
		ctx.strokeStyle = colors.roads[status];
		ctx.beginPath();
		for (const road of roads) {
			if (road.status === status) {
				path({ type: 'LineString', coordinates: road.coordinates });
			}
		}
		ctx.stroke();
	}
	ctx.lineCap = 'butt';
}

/** Draws one marker symbol: a circle with a bar, a triangle with a stroke, or a square with a slash. */
function drawEventSymbol(
	ctx: CanvasRenderingContext2D,
	kind: RoadEventKind,
	{ x, y }: PinPoint,
	colors: MapColors
): void {
	const radius = kind === 'roadwork' ? ROADWORK_RADIUS : EVENT_RADIUS;
	ctx.beginPath();
	if (kind === 'closure') {
		ctx.arc(x, y, radius, 0, Math.PI * 2);
	} else if (kind === 'collision') {
		ctx.moveTo(x, y - radius * 1.15);
		ctx.lineTo(x + radius * 1.1, y + radius * 0.85);
		ctx.lineTo(x - radius * 1.1, y + radius * 0.85);
		ctx.closePath();
	} else {
		ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
	}
	ctx.fillStyle = colors.roadEvents[kind];
	ctx.fill();
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = colors.labelHalo;
	ctx.stroke();

	// The mark inside is dark on the light symbols and white on the red one.
	ctx.beginPath();
	if (kind === 'closure') {
		ctx.moveTo(x - radius * 0.55, y);
		ctx.lineTo(x + radius * 0.55, y);
		ctx.strokeStyle = colors.label;
	} else if (kind === 'collision') {
		ctx.moveTo(x, y - radius * 0.35);
		ctx.lineTo(x, y + radius * 0.25);
		ctx.strokeStyle = colors.labelHalo;
	} else {
		ctx.moveTo(x - radius * 0.55, y + radius * 0.55);
		ctx.lineTo(x + radius * 0.55, y - radius * 0.55);
		ctx.strokeStyle = colors.labelHalo;
	}
	ctx.lineWidth = 2;
	ctx.lineCap = 'round';
	ctx.stroke();
	ctx.lineCap = 'butt';
}

/**
 * Marks each road event, with a different symbol per kind. The least serious are drawn first, so a
 * closure is never hidden under roadwork. `pins` holds each event's screen position, in order.
 */
export function drawEvents(
	ctx: CanvasRenderingContext2D,
	events: RoadEvent[],
	pins: PinPoint[],
	colors: MapColors
): void {
	for (const kind of EVENT_KINDS) {
		events.forEach((event, index) => {
			if (event.kind === kind) drawEventSymbol(ctx, kind, pins[index], colors);
		});
	}
}

/** Marks the company office with a diamond, drawn larger than a client pin so it stands apart. */
export function drawOffice(
	ctx: CanvasRenderingContext2D,
	office: PinPoint,
	colors: MapColors
): void {
	ctx.beginPath();
	ctx.moveTo(office.x, office.y - OFFICE_RADIUS);
	ctx.lineTo(office.x + OFFICE_RADIUS, office.y);
	ctx.lineTo(office.x, office.y + OFFICE_RADIUS);
	ctx.lineTo(office.x - OFFICE_RADIUS, office.y);
	ctx.closePath();
	ctx.fillStyle = colors.office;
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = colors.labelHalo;
	ctx.stroke();
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
	ctx.lineWidth = HIGHLIGHT_LINE_WIDTH;
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
