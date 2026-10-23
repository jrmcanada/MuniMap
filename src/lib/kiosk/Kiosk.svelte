<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { beat, lastBeat } from './heartbeat.js';
	import { msUntilNextRefresh } from './refresh.js';
	import { shouldReloadForStall } from './watchdog.js';

	const CHECK_MS = 5000;
	const CURSOR_IDLE_MS = 3000;
	/** A held pin can put off the daily refresh, but not for longer than this. */
	const REFRESH_DEFER_MS = 5 * 60 * 1000;
	const LAST_RELOAD_KEY = 'tmm-last-watchdog-reload';

	/** True while a visitor has a municipality held on the panel. */
	let { busy = false }: { busy?: boolean } = $props();

	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	function readLastReload(): number | null {
		try {
			const stored = sessionStorage.getItem(LAST_RELOAD_KEY);
			return stored ? Number(stored) : null;
		} catch {
			// With no storage the guard can't be kept, so act as if a reload just happened.
			return Date.now();
		}
	}

	function writeLastReload(time: number): void {
		try {
			sessionStorage.setItem(LAST_RELOAD_KEY, String(time));
		} catch {
			// Nothing to do: readLastReload already fails safe.
		}
	}

	onMount(() => {
		beat();
		const root = document.documentElement;

		// Cursor: hidden after a few idle seconds, back when the mouse moves.
		let idle = setTimeout(() => root.classList.add('cursor-hidden'), CURSOR_IDLE_MS);
		function onPointerMove(event: PointerEvent) {
			if (event.pointerType !== 'mouse') return;
			root.classList.remove('cursor-hidden');
			clearTimeout(idle);
			idle = setTimeout(() => root.classList.add('cursor-hidden'), CURSOR_IDLE_MS);
		}
		document.addEventListener('pointermove', onPointerMove);

		// Screen wake lock: a bonus on top of the PC's own power settings.
		let lock: WakeLockSentinel | null = null;
		let destroyed = false;
		async function keepAwake() {
			if (lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
			try {
				const granted = await navigator.wakeLock.request('screen');
				// The page may have gone while the request was pending.
				if (destroyed) return void granted.release();
				lock = granted;
				lock.addEventListener('release', () => (lock = null));
			} catch {
				// The browser said no; the power settings still apply.
			}
		}
		function onVisibility() {
			if (document.visibilityState !== 'visible') return;
			beat();
			void keepAwake();
		}
		document.addEventListener('visibilitychange', onVisibility);
		void keepAwake();

		// The 4:00 am refresh is checked against the clock, so a sleep, resume or clock change
		// can't miss it.
		const refreshAt = Date.now() + msUntilNextRefresh(Date.now());

		const timer = setInterval(() => {
			const now = Date.now();
			// The map doesn't animate under reduced motion, so these ticks stand in for its beat.
			if (reducedMotion.current) beat();

			const stalled =
				document.visibilityState === 'visible' &&
				shouldReloadForStall(lastBeat(), now, readLastReload());
			if (stalled) {
				writeLastReload(now);
				location.reload();
				return;
			}
			if (now >= refreshAt && (!busy || now - refreshAt >= REFRESH_DEFER_MS)) location.reload();
		}, CHECK_MS);

		return () => {
			destroyed = true;
			clearInterval(timer);
			clearTimeout(idle);
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('visibilitychange', onVisibility);
			root.classList.remove('cursor-hidden');
			void lock?.release();
		};
	});
</script>

<style>
	/* Wins over the hand that the map sets on the canvas. */
	:global(html.cursor-hidden),
	:global(html.cursor-hidden *) {
		cursor: none !important;
	}
</style>
