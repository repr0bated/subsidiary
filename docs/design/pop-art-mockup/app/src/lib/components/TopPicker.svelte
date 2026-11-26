<script lang="ts">
	import { POP_THEMES, type PopTheme } from '$lib/data/themes';

	let {
		activeTheme,
		onSelectTheme
	}: {
		activeTheme: PopTheme;
		onSelectTheme: (theme: PopTheme) => void;
	} = $props();

	let isOpen = $state(false);
</script>

<header class="top-pulldown-wrapper">
	<!-- Top Bar -->
	<div class="top-bar">
		<div class="brand">
			<span class="badge">POP!</span>
			<h1>POP ART // MOCKUP</h1>
		</div>

		<button
			class="comic-btn picker-toggle"
			onclick={() => (isOpen = !isOpen)}
			aria-expanded={isOpen}
		>
			<span>EDITION: {activeTheme.code}. {activeTheme.title}</span>
			<span class="arrow">{isOpen ? '▲ CLOSE' : '▼ PICKER'}</span>
		</button>
	</div>

	<!-- Collapsible Drawer -->
	<div class="pulldown-drawer benday-yellow" class:open={isOpen}>
		<div class="drawer-inner">
			<div class="drawer-header">
				<span class="speech-tag">SELECT PALETTE & CANVAS!</span>
				<small>Changes CSS variables, Ben-Day dot density & hero artwork</small>
			</div>

			<div class="theme-grid">
				{#each POP_THEMES as theme}
					<button
						class="theme-card comic-panel"
						class:active={activeTheme.id === theme.id}
						onclick={() => {
							onSelectTheme(theme);
							isOpen = false;
						}}
					>
						<div class="swatches">
							<span style="background:{theme.primary}"></span>
							<span style="background:{theme.secondary}"></span>
							<span style="background:{theme.accent}"></span>
						</div>
						<div class="card-meta">
							<strong>{theme.code}. {theme.title}</strong>
							<span>{theme.year}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Hanging Comic Pull-Tab -->
	<button
		class="pull-tab"
		onclick={() => (isOpen = !isOpen)}
		title="Toggle palette picker"
	>
		{isOpen ? '▲ HIDE PALETTE' : '▼ ART PICKER'}
	</button>
</header>

<style>
	.top-pulldown-wrapper {
		position: sticky;
		top: 0;
		z-index: 50;
		width: 100%;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: var(--pop-primary);
		border-bottom: 4px solid var(--pop-ink);
		color: #fff;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.brand h1 {
		font-family: var(--font-display);
		font-size: clamp(1.2rem, 2.5vw, 1.8rem);
		letter-spacing: 0.05em;
		text-shadow: 3px 3px 0px var(--pop-ink);
	}

	.badge {
		background: var(--pop-secondary);
		color: var(--pop-ink);
		font-family: var(--font-display);
		padding: 0.2rem 0.6rem;
		border: 3px solid var(--pop-ink);
		transform: rotate(-4deg);
		font-size: 1.1rem;
	}

	.picker-toggle {
		background: var(--pop-secondary);
		color: var(--pop-ink);
		padding: 0.45rem 1rem;
		font-size: 1.05rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.pulldown-drawer {
		max-height: 0;
		overflow: hidden;
		border-bottom: 0px solid var(--pop-ink);
		transition: max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-width 0.2s;
	}

	.pulldown-drawer.open {
		max-height: 420px;
		border-bottom: 4px solid var(--pop-ink);
	}

	.drawer-inner {
		max-width: 1150px;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 1.5rem;
	}

	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.speech-tag {
		background: #fff;
		border: 3px solid var(--pop-ink);
		padding: 0.25rem 0.75rem;
		font-family: var(--font-display);
		font-size: 1.1rem;
		box-shadow: 3px 3px 0px var(--pop-ink);
	}

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 1rem;
	}

	.theme-card {
		padding: 0.85rem;
		text-align: left;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.theme-card.active {
		background: var(--pop-secondary);
		outline: 3px dashed var(--pop-ink);
		outline-offset: -6px;
	}

	.swatches {
		display: flex;
		gap: 0.4rem;
	}

	.swatches span {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2.5px solid var(--pop-ink);
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-display);
		font-size: 1.15rem;
	}

	.pull-tab {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		background: var(--pop-secondary);
		color: var(--pop-ink);
		font-family: var(--font-display);
		font-size: 0.95rem;
		letter-spacing: 0.06em;
		padding: 0.25rem 1.1rem;
		border: 3px solid var(--pop-ink);
		border-top: none;
		border-radius: 0 0 12px 12px;
		box-shadow: 3px 3px 0px var(--pop-ink);
		cursor: pointer;
	}
</style>
