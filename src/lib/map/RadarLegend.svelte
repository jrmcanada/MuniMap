<script lang="ts">
	/**
	 * The radar colour scale, as Environment Canada draws it: 14 evenly spaced steps from light drizzle
	 * to extreme rain. Rain is in mm/h and snow in cm/h; both use the same colours. Only some of the
	 * steps are labelled, so the numbers stay readable.
	 */
	const SCALES = [
		{
			name: 'Rain',
			unit: 'mm/h',
			steps: [0.1, 4, 12, 32, 64, 200],
			at: [0, 3, 5, 8, 10, 13]
		},
		{ name: 'Snow', unit: 'cm/h', steps: [0.1, 0.5, 1, 3, 5, 20], at: [0, 3, 5, 8, 10, 13] }
	];
	const STEP_COUNT = 13;
</script>

<div
	class="legend"
	role="img"
	aria-label="Radar colours, from light blue for light rain or snow to purple for extreme"
>
	{#each SCALES as { name, unit, steps, at } (name)}
		<div class="scale">
			<span class="name">{name} <i>{unit}</i></span>
			<div class="track">
				<div class="ramp"></div>
				<div class="ticks">
					{#each steps as step, index (step)}
						<span style:left="{(at[index] / STEP_COUNT) * 100}%">{step}</span>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.35rem 0.5rem 0.3rem;
		/* The same solid card as the weather bar and road legend. */
		border: 1px solid var(--map-panel-border);
		border-radius: 0.3rem;
		background: var(--map-panel-background);
		box-shadow: var(--map-panel-shadow);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--map-caption);
	}

	.scale {
		display: grid;
		grid-template-columns: 4.6rem 22rem;
		align-items: start;
		gap: 0 0.5rem;
	}

	.name {
		line-height: 1.1rem;
	}

	.name i {
		font-style: normal;
		font-weight: 400;
	}

	.ramp {
		height: 0.55rem;
		margin-top: 0.275rem;
		border-radius: 0.2rem;
		background: var(--radar-ramp);
	}

	/* Labels sit under their step. The first and last stay inside the bar's ends. */
	.ticks {
		position: relative;
		height: 1rem;
		font-weight: 400;
	}

	.ticks span {
		position: absolute;
		top: 0.1rem;
		transform: translateX(-50%);
	}

	.ticks span:first-child {
		transform: none;
	}

	.ticks span:last-child {
		transform: translateX(-100%);
	}
</style>
