import { ONTARIO_511_KEY } from '$app/env/private';
import { feedResponse } from '#lib/server/feedResponse.js';
import { loadRoadEvents } from '#lib/server/ontario511.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ fetch }) =>
	feedResponse(() => loadRoadEvents(ONTARIO_511_KEY, fetch));
