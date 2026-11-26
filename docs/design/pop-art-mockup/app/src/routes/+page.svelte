<script lang="ts">
	import { POP_THEMES, type PopTheme } from '$lib/data/themes';
	import TopPicker from '$lib/components/TopPicker.svelte';
	import ComicArt from '$lib/components/ComicArt.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import PopChatbot from '$lib/components/PopChatbot.svelte';

	let activeTheme = $state<PopTheme>(POP_THEMES[0]);
	let activeSection = $state('gallery');
	let loupeActive = $state(false);
	let chatOpen = $state(false);

	// Interactive Ben-Day Simulator State
	let dotSize = $state(6);
	let dotSpacing = $state(16);
	let rsvpBooked = $state(false);

	$effect(() => {
		const root = document.documentElement;
		root.style.setProperty('--pop-primary', activeTheme.primary);
		root.style.setProperty('--pop-secondary', activeTheme.secondary);
		root.style.setProperty('--pop-accent', activeTheme.accent);
		root.style.setProperty('--pop-bg', activeTheme.bg);
		root.style.setProperty('--pop-dot', activeTheme.dot);
	});

	function scrollToSection(id: string) {
		activeSection = id;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<TopPicker {activeTheme} onSelectTheme={(t) => (activeTheme = t)} />

<main class="container benday-bg">
	<!-- SECTION 1: HERO GALLERY -->
	<section id="gallery" class="hero-grid">
		<div class="comic-panel hero-copy">
			<span class="issue-tag">ISSUE #{activeTheme.code} • {activeTheme.year}</span>
			<h2 class="hero-title">{activeTheme.title}</h2>

			<blockquote class="speech-bubble">
				"{activeTheme.quote}"
			</blockquote>

			<p class="subquote">{activeTheme.subquote}</p>

			<div class="hero-actions">
				<button class="comic-btn primary-cta" onclick={() => (loupeActive = !loupeActive)}>
					{loupeActive ? '🔍 RESET ZOOM' : '🔍 BEN-DAY LOUPE'}
				</button>
				<button class="comic-btn secondary-cta" onclick={() => (chatOpen = true)}>
					💬 ASK CURATOR
				</button>
			</div>
		</div>

		<div class="comic-panel hero-artwork">
			<ComicArt theme={activeTheme} loupe={loupeActive} />
		</div>
	</section>

	<!-- SECTION 2: BEN-DAY DOT SIMULATOR -->
	<section id="dots" class="comic-panel section-block benday-yellow">
		<div class="section-header">
			<h3>02. BEN-DAY HALFTONE LAB</h3>
			<div class="controls">
				<label>
					DOT RADIUS: <strong>{dotSize}px</strong>
					<input type="range" min="2" max="14" bind:value={dotSize} />
				</label>
				<label>
					GRID SPACING: <strong>{dotSpacing}px</strong>
					<input type="range" min="10" max="32" bind:value={dotSpacing} />
				</label>
			</div>
		</div>

		<div
			class="halftone-canvas"
			style="
				background-image: radial-gradient(var(--pop-primary) {dotSize}px, transparent {dotSize}px);
				background-size: {dotSpacing}px {dotSpacing}px;
			"
		>
			<span class="caption-box">MECHANICAL PRINTING AMPLIFIED TO MONUMENTAL SCALE!</span>
		</div>
	</section>

	<!-- SECTION 3: STRIP OF PANELS -->
	<section id="bio" class="strip-grid">
		<article class="comic-panel strip-card">
			<span class="panel-badge">PANEL 1</span>
			<h4>THE CALL</h4>
			<p>The business writes one call file. The host checks identity, grants and the sealed schema.</p>
		</article>
		<article class="comic-panel strip-card benday-blue text-white">
			<span class="panel-badge">PANEL 2</span>
			<h4>THE RECEIPT</h4>
			<p>The answer comes back with a receipt, appended to the ledger in the same commit.</p>
		</article>
		<article class="comic-panel strip-card">
			<span class="panel-badge">PANEL 3</span>
			<h4>THE RECORD</h4>
			<p>Only the hash goes on the public record. Anyone holding the receipt can check it.</p>
		</article>
	</section>

	<!-- SECTION 4: MUSEUM GIFT SHOP -->
	<section id="merch" class="comic-panel section-block">
		<div class="section-header">
			<h3>04. POP MUSEUM PRINT SHOP</h3>
			<span class="issue-tag">LIMITED SILKSCREEN EDITIONS</span>
		</div>
		<div class="merch-grid">
			<div class="merch-item">
				<div class="merch-thumb" style="background: var(--pop-primary)">ZAP!</div>
				<strong>DIPTYCH LITHOGRAPH</strong>
				<span>$85.00</span>
			</div>
			<div class="merch-item">
				<div class="merch-thumb" style="background: var(--pop-secondary); color: #111">POW!</div>
				<strong>ENAMEL PIN SET (4PK)</strong>
				<span>$24.00</span>
			</div>
			<div class="merch-item">
				<div class="merch-thumb" style="background: var(--pop-accent)">DOTS</div>
				<strong>EXHIBITION MONOGRAPH</strong>
				<span>$60.00</span>
			</div>
		</div>
	</section>

	<!-- SECTION 5: EXHIBITION EVENTS & RSVP -->
	<section id="events" class="comic-panel section-block benday-yellow">
		<div class="event-row">
			<div>
				<span class="issue-tag">LIVE RETROSPECTIVE • GALLERY 4</span>
				<h3>POP ART SHOWCASE</h3>
				<p>Experience 45 monumental canvases, original perforated metal dot stencils, and audio commentary.</p>
			</div>
			<button class="comic-btn primary-cta" onclick={() => (rsvpBooked = !rsvpBooked)}>
				{rsvpBooked ? '🎟️ PASS RESERVED!' : '🎟️ CLAIM VIP PASS'}
			</button>
		</div>
	</section>
</main>

<BottomNav
	{activeSection}
	onNavigate={scrollToSection}
	onToggleChat={() => (chatOpen = !chatOpen)}
/>

<PopChatbot bind:isOpen={chatOpen} />

<style>
	.container {
		max-width: 1150px;
		margin: 0 auto;
		padding: 2.25rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: 1.05fr 1fr;
		gap: 1.5rem;
		align-items: stretch;
	}

	@media (max-width: 820px) {
		.hero-grid {
			grid-template-columns: 1fr;
		}
	}

	.hero-copy {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 1rem;
	}

	.issue-tag {
		display: inline-block;
		width: fit-content;
		background: var(--pop-ink);
		color: var(--pop-secondary);
		font-family: var(--font-display);
		padding: 0.25rem 0.7rem;
		letter-spacing: 0.06em;
	}

	.hero-title {
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 5vw, 3.8rem);
		line-height: 0.95;
		color: var(--pop-primary);
		text-shadow: 3px 3px 0px var(--pop-ink);
	}

	.speech-bubble {
		background: #fff;
		border: 3.5px solid var(--pop-ink);
		border-radius: 22px;
		padding: 1rem 1.2rem;
		font-weight: 700;
		font-size: 1.05rem;
		box-shadow: 4px 4px 0px var(--pop-ink);
	}

	.subquote {
		font-weight: 700;
		opacity: 0.85;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.primary-cta {
		background: var(--pop-primary);
		color: #fff;
		padding: 0.65rem 1.2rem;
		font-size: 1.15rem;
	}

	.secondary-cta {
		background: var(--pop-secondary);
		color: var(--pop-ink);
		padding: 0.65rem 1.2rem;
		font-size: 1.15rem;
	}

	.hero-artwork {
		padding: 0.75rem;
		display: flex;
		align-items: center;
	}

	.section-block {
		padding: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.section-header h3,
	.event-row h3 {
		font-family: var(--font-display);
		font-size: 1.85rem;
		letter-spacing: 0.04em;
	}

	.controls {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
		background: #fff;
		padding: 0.5rem 0.9rem;
		border: 3px solid var(--pop-ink);
	}

	.controls label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.halftone-canvas {
		height: 150px;
		background-color: #fff;
		border: 4px solid var(--pop-ink);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.caption-box {
		background: var(--pop-secondary);
		border: 3px solid var(--pop-ink);
		padding: 0.45rem 1rem;
		font-family: var(--font-display);
		font-size: 1.2rem;
		box-shadow: 4px 4px 0px var(--pop-ink);
	}

	.strip-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.25rem;
	}

	.strip-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.strip-card.text-white {
		color: #fff;
	}

	.strip-card h4 {
		font-family: var(--font-display);
		font-size: 1.5rem;
		letter-spacing: 0.04em;
	}

	.panel-badge {
		background: var(--pop-secondary);
		color: var(--pop-ink);
		border: 2.5px solid var(--pop-ink);
		font-family: var(--font-display);
		padding: 0.15rem 0.55rem;
		width: fit-content;
	}

	.merch-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.merch-item {
		border: 3px solid var(--pop-ink);
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		background: var(--pop-bg);
	}

	.merch-thumb {
		height: 95px;
		border: 3px solid var(--pop-ink);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 2rem;
		color: #fff;
		text-shadow: 2px 2px 0 #111;
	}

	.event-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}
</style>
