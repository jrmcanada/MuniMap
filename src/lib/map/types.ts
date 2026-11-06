import type { RoadEventKind } from '#lib/roads/events.js';
import type { RoadStatus } from '#lib/roads/status.js';
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson';

export interface MapFeatureProperties {
	kind: 'region' | 'lake';
	name: string;
	ontario?: boolean;
}

export type MapFeature = Feature<Polygon | MultiPolygon, MapFeatureProperties>;
export type MapData = FeatureCollection<Polygon | MultiPolygon, MapFeatureProperties>;

export type HighwayData = FeatureCollection<LineString, Record<string, never>>;

export interface MapColors {
	land: string;
	neighbour: string;
	border: string;
	highway: string;
	/** Road condition line colours, by status. */
	roads: Record<RoadStatus, string>;
	/** Road event marker colours, by kind. */
	roadEvents: Record<RoadEventKind, string>;
	office: string;
	water: string;
	pin: string;
	pinGlow: string;
	highlight: string;
	label: string;
	/** Place names: quieter than the highlighted municipality's label. */
	placeLabel: string;
	labelHalo: string;
	fontFamily: string;
}

export interface PinPoint {
	x: number;
	y: number;
}
