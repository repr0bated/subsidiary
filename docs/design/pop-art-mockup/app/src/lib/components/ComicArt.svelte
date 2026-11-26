<script lang="ts">
	import type { PopTheme } from '$lib/data/themes';

	let { theme, loupe = false }: { theme: PopTheme; loupe?: boolean } = $props();
</script>

<div class="art-frame" class:loupe>
	<svg viewBox="0 0 500 340" class="pop-svg" role="img" aria-label={theme.title}>
		<defs>
			<pattern id="bendayPattern" width="10" height="10" patternUnits="userSpaceOnUse">
				<circle cx="5" cy="5" r={loupe ? '3.6' : '2.2'} fill={theme.dot} opacity="0.45" />
			</pattern>
		</defs>

		<!-- Background -->
		<rect width="500" height="340" fill={theme.secondary} />
		<rect width="500" height="340" fill="url(#bendayPattern)" />

		{#if theme.id === 'zap'}
			<!-- Explosion Starburst -->
			<polygon
				points="260,170 310,40 345,125 460,70 390,175 480,245 365,245 385,325 295,255 230,320 245,230 140,240 215,175 150,95 250,130"
				fill={theme.primary}
				stroke="#111"
				stroke-width="6"
			/>
			<polygon
				points="275,170 315,85 335,140 410,105 365,175 425,220 345,220 355,280 295,230 250,275 260,210 190,215 240,175 195,120 265,145"
				fill="#FFFDF5"
				stroke="#111"
				stroke-width="5"
			/>
			<text
				x="255"
				y="192"
				font-family="Bangers, cursive"
				font-size="68"
				fill={theme.primary}
				stroke="#111"
				stroke-width="4"
			>
				ZAP!
			</text>
		{:else if theme.id === 'wave'}
			<!-- Swirl Waves -->
			<path d="M0,210 Q125,150 250,210 T500,210 L500,340 L0,340 Z" fill={theme.primary} stroke="#111" stroke-width="6" />
			<path d="M0,255 Q125,205 250,255 T500,255 L500,340 L0,340 Z" fill={theme.accent} stroke="#111" stroke-width="5" />
			<circle cx="250" cy="150" r="60" fill={theme.secondary} stroke="#111" stroke-width="6" />
		{:else if theme.id === 'frame'}
			<!-- Framed Canvas Inside Canvas -->
			<rect x="65" y="40" width="370" height="260" fill="#FFF" stroke="#111" stroke-width="8" />
			<circle cx="195" cy="170" r="75" fill={theme.primary} stroke="#111" stroke-width="6" />
			<rect x="240" y="95" width="145" height="145" fill={theme.secondary} stroke="#111" stroke-width="6" />
			<text
				x="110"
				y="185"
				font-family="Bangers, cursive"
				font-size="54"
				fill="#FFF"
				stroke="#111"
				stroke-width="3.5"
			>
				LOOK!
			</text>
		{:else}
			<!-- Primary Ben-Day Geometric Grid -->
			<circle cx="150" cy="170" r="95" fill={theme.primary} stroke="#111" stroke-width="6" />
			<rect x="255" y="75" width="175" height="190" fill={theme.accent} stroke="#111" stroke-width="6" />
			<polygon points="250,55 340,275 160,275" fill="#FFF" stroke="#111" stroke-width="6" opacity="0.92" />
		{/if}
	</svg>
</div>

<style>
	.art-frame {
		border: 4px solid var(--pop-ink);
		background: #fff;
		overflow: hidden;
		position: relative;
	}

	.pop-svg {
		display: block;
		width: 100%;
		height: auto;
		transition: transform 0.25s ease;
	}

	.art-frame.loupe .pop-svg {
		transform: scale(1.28);
	}
</style>
