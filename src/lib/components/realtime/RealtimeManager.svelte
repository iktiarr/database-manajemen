<script>
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import RadioIcon from '@lucide/svelte/icons/radio';
	import PlayIcon from '@lucide/svelte/icons/play';
	import SquareIcon from '@lucide/svelte/icons/square';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let {
		databases = [],
		initialEndpoint = 'https://ep-small-heart-b3pici55.rt.c-4.ap-southeast-1.aws.neon.tech/',
		initialSecret = 'nrt_live_1-8iWilDq4tLfIlH3fxpd5EsSPxoN5-FgbhLk-NDMZzw'
	} = $props();

	let endpointUrl = $state('https://ep-small-heart-b3pici55.rt.c-4.ap-southeast-1.aws.neon.tech/');
	let realtimeSecret = $state('nrt_live_1-8iWilDq4tLfIlH3fxpd5EsSPxoN5-FgbhLk-NDMZzw');
	let showSecret = $state(false);
	let copiedEndpoint = $state(false);
	let copiedSecret = $state(false);

	// Subscription tester state
	let selectedDb = $state('');
	let testSql = $state('SELECT id, email, created_at FROM admins ORDER BY id DESC LIMIT 5;');
	let isSubscribed = $state(false);
	let isConnecting = $state(false);
	let subscriptionLogs = $state([]);

	onMount(() => {
		const savedEndpoint = localStorage.getItem('neon_realtime_endpoint');
		if (savedEndpoint) endpointUrl = savedEndpoint;
		else if (initialEndpoint) endpointUrl = initialEndpoint;

		const savedSecret = localStorage.getItem('neon_realtime_secret');
		if (savedSecret) realtimeSecret = savedSecret;
		else if (initialSecret) realtimeSecret = initialSecret;

		if (databases.length > 0 && !selectedDb) {
			selectedDb = databases[0].name;
		}
	});

	function saveSettings() {
		localStorage.setItem('neon_realtime_endpoint', endpointUrl.trim());
		localStorage.setItem('neon_realtime_secret', realtimeSecret.trim());
		toast.success('Pengaturan Disimpan', { description: 'Endpoint dan Secret Realtime berhasil diperbarui.' });
	}

	function copyToClipboard(text, type) {
		navigator.clipboard.writeText(text);
		if (type === 'endpoint') {
			copiedEndpoint = true;
			setTimeout(() => (copiedEndpoint = false), 2000);
		} else {
			copiedSecret = true;
			setTimeout(() => (copiedSecret = false), 2000);
		}
		toast.success('Tersalin', { description: `${type === 'endpoint' ? 'Endpoint URL' : 'Realtime Secret'} disalin ke clipboard.` });
	}

	function toggleSubscription() {
		if (isSubscribed) {
			isSubscribed = false;
			addLog('SYSTEM', 'Berhenti berlangganan query realtime.');
			toast.info('Berhenti Berlangganan', { description: 'Koneksi streaming ditutup.' });
			return;
		}

		if (!endpointUrl.trim()) {
			toast.error('Endpoint Kosong', { description: 'Harap isi Realtime SQL API Endpoint URL.' });
			return;
		}

		isConnecting = true;
		setTimeout(() => {
			isConnecting = false;
			isSubscribed = true;
			subscriptionLogs = [];
			addLog('CONNECT', `Terhubung ke ${endpointUrl}`);
			addLog('SUBSCRIBE', `Kueri: ${testSql}`);
			addLog('SNAPSHOT', JSON.stringify({
				event: 'initial_state',
				rows: [
					{ id: 1, email: 'admin@example.com', status: 'active', synced_at: new Date().toISOString() }
				]
			}));

			toast.success('Realtime Aktif', { description: 'Mendengarkan perubahan kueri secara langsung.' });
		}, 600);
	}

	function addLog(type, message) {
		const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		subscriptionLogs = [{ time, type, message }, ...subscriptionLogs.slice(0, 40)];
	}

	function triggerSimulatedUpdate() {
		if (!isSubscribed) return;
		const randomId = Math.floor(Math.random() * 900) + 100;
		addLog('LIVE_CHANGE', JSON.stringify({
			action: 'INSERT',
			table: 'admins',
			record: { id: randomId, email: `user_${randomId}@domain.com`, created_at: new Date().toISOString() }
		}));
		toast.info('Event Baru', { description: `Data baris baru #${randomId} diterima lewat WebSocket.` });
	}
</script>

<div class="space-y-6 w-full">
	<!-- Header Section -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold tracking-tight text-neutral-900">Neon Realtime</h1>
				<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-mono">
					WebSocket Live SQL
				</Badge>
			</div>
			<p class="text-xs text-neutral-500 mt-1 max-w-2xl">
				Neon Realtime memungkinkan query SQL apa pun berjalan secara langsung (live). Berlangganan perubahan data Postgres Lakebase untuk membangun aplikasi reaktif dan agen AI.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="https://neon.com/docs/realtime/quickstart"
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
			>
				<span>Dokumentasi</span>
				<ExternalLinkIcon class="w-3.5 h-3.5" />
			</a>
		</div>
	</div>

	<!-- Configuration Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
		<!-- Endpoint & Secret Card -->
		<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
			<div class="flex items-center justify-between">
				<Card.Title class="text-sm font-semibold text-neutral-900">Konfigurasi Realtime Endpoint</Card.Title>
				<span class="text-[11px] text-neutral-400">Dapat diedit dinamis</span>
			</div>

			<div class="space-y-3">
				<div>
					<label for="rt-endpoint" class="block text-xs font-medium text-neutral-700 mb-1">
						Realtime SQL API Endpoint URL
					</label>
					<div class="relative">
						<Input
							id="rt-endpoint"
							type="text"
							bind:value={endpointUrl}
							placeholder="https://...rt...neon.tech/"
							class="text-xs font-mono border-neutral-200 pr-9"
						/>
						<button
							type="button"
							onclick={() => copyToClipboard(endpointUrl, 'endpoint')}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 p-1 cursor-pointer"
							title="Salin Endpoint URL"
						>
							{#if copiedEndpoint}
								<CheckIcon class="w-3.5 h-3.5 text-emerald-600" />
							{:else}
								<CopyIcon class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
				</div>

				<div>
					<label for="rt-secret" class="block text-xs font-medium text-neutral-700 mb-1">
						NEON_REALTIME_SECRET (Branch-Scoped Secret)
					</label>
					<div class="relative">
						<Input
							id="rt-secret"
							type={showSecret ? 'text' : 'password'}
							bind:value={realtimeSecret}
							placeholder="nrt_live_..."
							class="text-xs font-mono border-neutral-200 pr-16"
						/>
						<div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
							<button
								type="button"
								onclick={() => (showSecret = !showSecret)}
								class="text-neutral-400 hover:text-neutral-800 p-1 cursor-pointer"
								title={showSecret ? 'Sembunyikan' : 'Lihat'}
							>
								{#if showSecret}
									<EyeOffIcon class="w-3.5 h-3.5" />
								{:else}
									<EyeIcon class="w-3.5 h-3.5" />
								{/if}
							</button>
							<button
								type="button"
								onclick={() => copyToClipboard(realtimeSecret, 'secret')}
								class="text-neutral-400 hover:text-neutral-800 p-1 cursor-pointer"
								title="Salin Secret"
							>
								{#if copiedSecret}
									<CheckIcon class="w-3.5 h-3.5 text-emerald-600" />
								{:else}
									<CopyIcon class="w-3.5 h-3.5" />
								{/if}
							</button>
						</div>
					</div>
					<p class="text-[11px] text-neutral-400 mt-1">
						Secret ini digunakan untuk membuat token otentikasi database pada branch ini.
					</p>
				</div>

				<div class="pt-2 flex justify-end">
					<Button
						onclick={saveSettings}
						class="text-xs bg-black hover:bg-neutral-800 text-white cursor-pointer"
					>
						Simpan Pengaturan Realtime
					</Button>
				</div>
			</div>
		</Card.Root>

		<!-- SDK Quickstart Integration Code -->
		<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-3">
			<div class="flex items-center justify-between">
				<Card.Title class="text-sm font-semibold text-neutral-900">Integrasi Kode Klien (SDK)</Card.Title>
				<Badge variant="outline" class="text-[10px] font-mono border-neutral-200 text-neutral-600">TypeScript / JS</Badge>
			</div>

			<div class="bg-neutral-950 text-neutral-200 rounded-lg p-3 font-mono text-[11px] overflow-x-auto border border-neutral-800 space-y-1">
				<p class="text-neutral-500">// npm i @neondatabase/realtime</p>
				<p><span class="text-purple-400">import</span> &#123; createRealtimeClient &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">'@neondatabase/realtime'</span>;</p>
				<br />
				<p><span class="text-blue-400">const</span> client = <span class="text-yellow-300">createRealtimeClient</span>(&#123;</p>
				<p class="pl-4">endpoint: <span class="text-emerald-400">"{endpointUrl}"</span>,</p>
				<p class="pl-4">secret: process.env.<span class="text-orange-300">NEON_REALTIME_SECRET</span></p>
				<p>&#125;);</p>
				<br />
				<p><span class="text-neutral-500">// Berlangganan query secara live</span></p>
				<p><span class="text-blue-400">const</span> sub = client.<span class="text-yellow-300">subscribe</span>(&#123;</p>
				<p class="pl-4">sql: <span class="text-emerald-400">"SELECT * FROM items ORDER BY id DESC"</span>,</p>
				<p class="pl-4">onData: (rows) =&gt; console.<span class="text-yellow-300">log</span>(<span class="text-emerald-400">'Live Rows:'</span>, rows)</p>
				<p>&#125;);</p>
			</div>
		</Card.Root>
	</div>

	<!-- Live Subscription Playground & Stream Monitor -->
	<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
		<div class="flex items-center justify-between flex-wrap gap-2">
			<div>
				<Card.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
					<RadioIcon class="w-4 h-4 {isSubscribed ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'}" />
					<span>Live Query Subscription Monitor</span>
				</Card.Title>
				<Card.Description class="text-xs text-neutral-500">
					Simulasi dan pengujian langsung query subscription ke database secara realtime.
				</Card.Description>
			</div>

			<div class="flex items-center gap-2">
				{#if isSubscribed}
					<Button
						variant="outline"
						size="sm"
						onclick={triggerSimulatedUpdate}
						class="text-xs border-neutral-200 hover:bg-neutral-50 cursor-pointer"
					>
						+ Kirim Simulasi Event
					</Button>
				{/if}

				<Button
					size="sm"
					disabled={isConnecting}
					onclick={toggleSubscription}
					class="text-xs min-w-32 flex items-center justify-center cursor-pointer {isSubscribed ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-black hover:bg-neutral-800 text-white'}"
				>
					{#if isConnecting}
						<Spinner size="xs" class="text-white" />
					{:else if isSubscribed}
						<SquareIcon class="w-3 h-3 mr-1.5" />
						<span>Berhenti</span>
					{:else}
						<PlayIcon class="w-3 h-3 mr-1.5" />
						<span>Mulai Berlangganan</span>
					{/if}
				</Button>
			</div>
		</div>

		<!-- Query input -->
		<div class="space-y-1.5">
			<label for="realtime-sql-query" class="text-xs font-medium text-neutral-700">Query SQL yang Ditonton</label>
			<Input
				id="realtime-sql-query"
				bind:value={testSql}
				disabled={isSubscribed}
				class="font-mono text-xs border-neutral-200"
			/>
		</div>

		<!-- Terminal / Event Log Stream -->
		<div class="bg-neutral-950 text-neutral-300 rounded-xl p-4 font-mono text-xs border border-neutral-900 space-y-2 min-h-[220px] max-h-[380px] overflow-y-auto">
			<div class="flex items-center justify-between pb-2 border-b border-neutral-800 text-[11px] text-neutral-400">
				<span>Status: {isSubscribed ? 'Streaming Aktif (Terhubung)' : 'Menunggu Koneksi'}</span>
				<span>{subscriptionLogs.length} Event Dicatat</span>
			</div>

			{#if subscriptionLogs.length === 0}
				<div class="py-12 text-center text-neutral-500 text-xs">
					Klik "Mulai Berlangganan" untuk mendengarkan stream WebSocket dan perubahan query live.
				</div>
			{:else}
				{#each subscriptionLogs as log}
					<div class="flex items-start gap-2.5 text-[11px] leading-relaxed">
						<span class="text-neutral-500 shrink-0">[{log.time}]</span>
						<Badge
							variant="outline"
							class="text-[9px] px-1 py-0 uppercase border-neutral-700 shrink-0 {log.type === 'LIVE_CHANGE' ? 'text-emerald-400 border-emerald-800' : 'text-neutral-300'}"
						>
							{log.type}
						</Badge>
						<span class="break-all {log.type === 'LIVE_CHANGE' ? 'text-emerald-300 font-semibold' : 'text-neutral-300'}">
							{log.message}
						</span>
					</div>
				{/each}
			{/if}
		</div>
	</Card.Root>
</div>

