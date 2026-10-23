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
	office: string;
	water: string;
	pin: string;
	pinGlow: string;
	highlight: string;
	label: string;
	labelHalo: string;
	fontFamily: string;
}

export interface PinPoint {
	x: number;
	y: number;
}
