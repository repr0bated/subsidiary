<script lang="ts">
	let {
		activeSection = 'gallery',
		onNavigate,
		onToggleChat
	}: {
		activeSection?: string;
		onNavigate: (sectionId: string) => void;
		onToggleChat: () => void;
	} = $props();

	const navButtons = [
		{ id: 'gallery', num: '1', label: 'GALLERY', color: '#FFE600' },
		{ id: 'dots', num: '2', label: 'DOTS', color: '#FFFFFF' },
		{ id: 'bio', num: '3', label: 'PANELS', color: '#00D4FF' },
		{ id: 'merch', num: '4', label: 'MERCH', color: '#FFE600' },
		{ id: 'events', num: '5', label: 'EVENTS', color: '#FFFFFF' },
		{ id: 'chat', num: '6', label: 'ASK POP-BOT', color: '#FF1E27', isChat: true }
	];
</script>

<nav class="bottom-nav" aria-label="Primary Comic Strip Navigation">
	<div class="nav-track">
		{#each navButtons as btn}
			<button
				class="nav-item"
				class:active={activeSection === btn.id}
				class:chat-btn={btn.isChat}
				style="--btn-bg: {btn.color}"
				onclick={() => (btn.isChat ? onToggleChat() : onNavigate(btn.id))}
			>
				<span class="panel-num">{btn.num}</span>
				<span class="panel-label">{btn.label}</span>
			</button>
		{/each}
	</div>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 60;
		background: var(--pop-ink);
		border-top: 4px solid var(--pop-ink);
		padding: 0.45rem 0.5rem;
	}

	.nav-track {
		max-width: 1150px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.45rem;
	}

	.nav-item {
		background: var(--btn-bg);
		color: var(--pop-ink);
		border: 3px solid var(--pop-ink);
		box-shadow: 0 3px 0 #fff;
		padding: 0.45rem 0.25rem;
		font-family: var(--font-display);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1.05;
		transition: transform 0.12s ease;
	}

	.nav-item:hover,
	.nav-item.active {
		transform: translateY(-4px);
		outline: 2px solid #fff;
	}

	.nav-item.chat-btn {
		color: #fff;
		text-shadow: 2px 2px 0 var(--pop-ink);
	}

	.panel-num {
		font-size: 0.78rem;
		opacity: 0.85;
	}

	.panel-label {
		font-size: clamp(0.85rem, 1.8vw, 1.15rem);
		letter-spacing: 0.05em;
	}
</style>
