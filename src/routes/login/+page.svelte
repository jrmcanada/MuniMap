<script lang="ts">
	import logo from '#lib/assets/tmm-logo.png';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>MuniMap sign in</title>
</svelte:head>

<main class="login">
	<form method="POST" action="?/signIn" class="card">
		<img class="logo" src={logo} alt="The Managed Municipality" />
		<h1>MuniMap</h1>
		<label for="password">Password</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="password"
			name="password"
			type="password"
			autocomplete="current-password"
			autofocus
		/>
		{#if form?.wrong}<p class="error" role="alert">That password is not right.</p>{/if}
		<button type="submit">Sign in</button>
	</form>
</main>

<style>
	.login {
		display: grid;
		place-items: center;
		min-height: 100dvh;
		padding: 1rem;
		background: var(--map-background);
		color: var(--panel-text);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: min(22rem, 100%);
		padding: 1.5rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.5rem;
		background: var(--panel-background);
	}

	.logo {
		height: 3.5rem;
		width: auto;
		align-self: flex-start;
	}

	h1 {
		margin: 0;
		font-size: 1.4rem;
	}

	label {
		color: var(--panel-muted);
	}

	input {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.3rem;
		background: var(--card-background);
		color: var(--panel-text);
		font: inherit;
	}

	button {
		padding: 0.55rem;
		border: 0;
		border-radius: 0.3rem;
		background: var(--map-office);
		color: var(--map-background);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.error {
		margin: 0;
		color: var(--warning-red);
	}
</style>
