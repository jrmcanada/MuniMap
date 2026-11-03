<script lang="ts">
	import { ROAD_STATUSES, type RoadStatus } from '#lib/roads/status.js';

	let { source }: { source: string } = $props();

	const LABELS: Record<RoadStatus, string> = {
		clear: 'Clear',
		wet: 'Wet',
		snow: 'Snow covered',
		ice: 'Icy'
	};
</script>

<div class="legend">
	<ul>
		{#each ROAD_STATUSES as status (status)}
			<li><span class="swatch {status}"></span>{LABELS[status]}</li>
		{/each}
		<li><span class="closed"></span>Closed</li>
		<li><span class="collision"></span>Collision</li>
		<li><span class="roadwork"></span>Roadwork</li>
	</ul>
	<p class="source">{source}</p>
</div>

<style>
	.legend {
		position: absolute;
		left: 0.75rem;
		bottom: 0.5rem;
		padding: 0.3rem 0.5rem;
		border-radius: 0.3rem;
		background: var(--map-label-halo);
		pointer-events: none;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--map-caption);
	}

	ul {
		display: flex;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.swatch {
		width: 1.25rem;
		height: 0.2rem;
		border-radius: 0.1rem;
	}

	.clear {
		background: var(--road-clear);
	}

	.wet {
		background: var(--road-wet);
	}

	.snow {
		background: var(--road-snow);
	}

	.ice {
		background: var(--road-ice);
	}

	.closed {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		background: var(--road-closed);
	}

	.collision {
		width: 0.8rem;
		height: 0.7rem;
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
		background: var(--road-collision);
	}

	.roadwork {
		width: 0.6rem;
		height: 0.6rem;
		background: var(--road-roadwork);
	}

	.source {
		margin: 0.15rem 0 0;
		font-weight: 400;
	}
</style>
