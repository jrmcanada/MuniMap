<script lang="ts">
	import MapView from '#lib/map/MapView.svelte';
</script>

<main class="screen">
	<section class="map-area">
		<MapView />
	</section>
</main>

<style>
	.screen {
		display: flex;
		width: 100vw;
		height: 100dvh;
		background: var(--map-background);
	}

	.map-area {
		flex: 0 0 75%;
	}
</style>
