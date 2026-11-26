<script lang="ts">
	let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

	interface Message {
		sender: 'bot' | 'user';
		text: string;
	}

	let input = $state('');
	let messages = $state<Message[]>([
		{
			sender: 'bot',
			text: 'ZAP! WELCOME TO THE POP-ART STUDIO! ASK ME ABOUT BEN-DAY DOTS, RECEIPTS OR COMIC PANELS!'
		}
	]);

	const quickPrompts = ['What are Ben-Day dots?', 'What is a receipt?', 'Why comic strips?'];

	function sendMessage(promptText?: string) {
		const query = (promptText ?? input).trim();
		if (!query) return;

		messages = [...messages, { sender: 'user', text: query.toUpperCase() }];
		input = '';

		const lower = query.toLowerCase();
		let reply =
			'GREAT QUESTION! ASK ME ABOUT DOTS, RECEIPTS OR COMIC PANELS!';

		if (lower.includes('dot') || lower.includes('ben')) {
			reply = 'BEN-DAY DOTS ARE TINY HALFTONE CIRCLES FROM OLD NEWSPRINT. A FEW SIZES AND SPACINGS MAKE EVERY SHADE!';
		} else if (lower.includes('receipt')) {
			reply = 'A RECEIPT PROVES A CALL HAPPENED. ITS HASH GOES ON THE PUBLIC RECORD, NEVER THE DATA!';
		} else if (lower.includes('comic') || lower.includes('why')) {
			reply = 'COMIC PANELS TELL ONE STEP AT A TIME, IN BIG FLAT COLOUR. EASY TO FOLLOW!';
		}

		setTimeout(() => {
			messages = [...messages, { sender: 'bot', text: reply }];
		}, 220);
	}
</script>

<aside class="chatbot-dock" class:open={isOpen} aria-label="Pop-Bot Assistant">
	<!-- Speech-Bubble Pull-Up Handle -->
	<button class="pull-up-tab" onclick={() => (isOpen = !isOpen)}>
		<span>💬 {isOpen ? 'CLOSE POP-BOT ▼' : 'CHAT WITH POP-BOT! ▲'}</span>
	</button>

	<div class="chat-window comic-panel benday-bg">
		<div class="chat-header">
			<strong>POP-BOT // GUIDE</strong>
			<button class="close-x" onclick={() => (isOpen = false)}>✕</button>
		</div>

		<div class="chat-feed">
			{#each messages as msg}
				<div class="bubble {msg.sender}">
					{msg.text}
				</div>
			{/each}
		</div>

		<div class="quick-chips">
			{#each quickPrompts as chip}
				<button class="chip" onclick={() => sendMessage(chip)}>{chip}</button>
			{/each}
		</div>

		<form
			class="chat-form"
			onsubmit={(e) => {
				e.preventDefault();
				sendMessage();
			}}
		>
			<input bind:value={input} placeholder="TYPE YOUR QUESTION..." />
			<button type="submit" class="comic-btn send-btn">POW!</button>
		</form>
	</div>
</aside>

<style>
	.chatbot-dock {
		position: fixed;
		right: 1rem;
		bottom: 66px;
		z-index: 55;
		width: min(390px, calc(100vw - 2rem));
		transform: translateY(calc(100% - 38px));
		transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.chatbot-dock.open {
		transform: translateY(-6px);
	}

	.pull-up-tab {
		display: block;
		margin-left: auto;
		background: var(--pop-secondary);
		color: var(--pop-ink);
		font-family: var(--font-display);
		font-size: 1rem;
		letter-spacing: 0.05em;
		padding: 0.35rem 1rem;
		border: 3px solid var(--pop-ink);
		border-bottom: none;
		border-radius: 14px 14px 0 0;
		box-shadow: 4px 0 0 var(--pop-ink);
		cursor: pointer;
	}

	.chat-window {
		display: flex;
		flex-direction: column;
		height: 360px;
		background-color: #fffdf5;
	}

	.chat-header {
		background: var(--pop-primary);
		color: #fff;
		padding: 0.55rem 0.85rem;
		border-bottom: 3px solid var(--pop-ink);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-display);
		letter-spacing: 0.05em;
	}

	.close-x {
		background: var(--pop-secondary);
		border: 2px solid var(--pop-ink);
		font-weight: 900;
		padding: 0 0.45rem;
		cursor: pointer;
	}

	.chat-feed {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.bubble {
		max-width: 85%;
		padding: 0.6rem 0.75rem;
		border: 3px solid var(--pop-ink);
		font-size: 0.85rem;
		font-weight: 700;
		line-height: 1.3;
	}

	.bubble.bot {
		align-self: flex-start;
		background: #fff;
		border-radius: 14px 14px 14px 2px;
		box-shadow: 3px 3px 0 var(--pop-ink);
	}

	.bubble.user {
		align-self: flex-end;
		background: var(--pop-secondary);
		border-radius: 14px 14px 2px 14px;
		box-shadow: -3px 3px 0 var(--pop-ink);
	}

	.quick-chips {
		display: flex;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		overflow-x: auto;
		background: #fff;
		border-top: 2px solid var(--pop-ink);
	}

	.chip {
		white-space: nowrap;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		border: 2px solid var(--pop-ink);
		background: var(--pop-bg);
		cursor: pointer;
	}

	.chat-form {
		display: flex;
		gap: 0.4rem;
		padding: 0.5rem;
		background: var(--pop-secondary);
		border-top: 3px solid var(--pop-ink);
	}

	.chat-form input {
		flex: 1;
		border: 3px solid var(--pop-ink);
		padding: 0.4rem 0.6rem;
		font-family: var(--font-comic);
		font-weight: 700;
	}

	.send-btn {
		background: var(--pop-primary);
		color: #fff;
		padding: 0.35rem 0.85rem;
	}
</style>
