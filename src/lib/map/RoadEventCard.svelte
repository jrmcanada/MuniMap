<script lang="ts">
	import type { RoadEvent, RoadEventKind } from '#lib/roads/events.js';
	import { formatEventTime } from '#lib/roads/format.js';

	let { event, onClose }: { event: RoadEvent; onClose: () => void } = $props();

	const KIND_LABELS: Record<RoadEventKind, string> = {
		closure: 'Road closed',
		collision: 'Collision',
		roadwork: 'Roadwork'
	};
</script>

<article class="card {event.kind}">
	<header>
		<h3>{KIND_LABELS[event.kind]}<span class="road">{event.roadway}</span></h3>
		<button type="button" aria-label="Close" onclick={onClose}>×</button>
	</header>
	<p class="description">{event.description}</p>
	<dl>
		{#if event.direction}<dt>Direction</dt>
			<dd>{event.direction}</dd>{/if}
		{#if event.lanesAffected}<dt>Lanes</dt>
			<dd>{event.lanesAffected}</dd>{/if}
		{#if event.plannedEndAt}<dt>Expected until</dt>
			<dd>{formatEventTime(event.plannedEndAt)}</dd>{/if}
		{#if event.updatedAt}<dt>Updated</dt>
			<dd>{formatEventTime(event.updatedAt)}</dd>{/if}
	</dl>
</article>

<style>
	.card {
		width: min(20rem, 38vw);
		padding: 0.6rem 0.75rem 0.7rem;
		border: 1px solid var(--panel-border);
		border-left: 0.3rem solid var(--road-closed);
		border-radius: 0.5rem;
		background: var(--card-background);
		color: var(--panel-text);
		font-size: 0.9rem;
		box-shadow: 0 0.4rem 1.2rem oklch(0 0 0 / 0.45);
	}

	.collision {
		border-left-color: var(--road-collision);
	}

	.roadwork {
		border-left-color: var(--road-roadwork);
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
	}

	.road {
		margin-left: 0.5rem;
		font-weight: 400;
		color: var(--panel-muted);
	}

	button {
		border: 0;
		background: none;
		color: var(--panel-muted);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}

	.description {
		margin: 0.35rem 0 0.5rem;
	}

	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15rem 0.75rem;
		margin: 0;
		color: var(--panel-muted);
	}

	dd {
		margin: 0;
		color: var(--panel-text);
	}
</style>
