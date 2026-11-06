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
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let {
		initialAuthUrl = 'https://ep-small-heart-b3pici55.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth',
		initialJwksUrl = 'https://ep-small-heart-b3pici55.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json'
	} = $props();

	let authBaseUrl = $state('https://ep-small-heart-b3pici55.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth');
	let jwksUrl = $state('https://ep-small-heart-b3pici55.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json');
	let copiedAuth = $state(false);
	let copiedJwks = $state(false);

	// JWKS Live Inspection
	let isLoadingJwks = $state(false);
	let jwksData = $state(null);
	let jwksError = $state('');

	// JWT Decoder / Tester
	let testJwtToken = $state('');
	let decodedJwtHeader = $state(null);
	let decodedJwtPayload = $state(null);

	onMount(() => {
		const savedAuth = localStorage.getItem('neon_auth_base_url');
		if (savedAuth) authBaseUrl = savedAuth;
		else if (initialAuthUrl) authBaseUrl = initialAuthUrl;

		const savedJwks = localStorage.getItem('neon_auth_jwks_url');
		if (savedJwks) jwksUrl = savedJwks;
		else if (initialJwksUrl) jwksUrl = initialJwksUrl;

		fetchLiveJwks();
	});

	function saveAuthSettings() {
		localStorage.setItem('neon_auth_base_url', authBaseUrl.trim());
		localStorage.setItem('neon_auth_jwks_url', jwksUrl.trim());
		toast.success('Pengaturan Disimpan', { description: 'Konfigurasi Neon Auth & JWKS berhasil diperbarui.' });
	}

	function copyText(text, type) {
		navigator.clipboard.writeText(text);
		if (type === 'auth') {
			copiedAuth = true;
			setTimeout(() => (copiedAuth = false), 2000);
		} else {
			copiedJwks = true;
			setTimeout(() => (copiedJwks = false), 2000);
		}
		toast.success('Tersalin', { description: 'URL disalin ke clipboard.' });
	}

	async function fetchLiveJwks() {
		if (!jwksUrl.trim()) return;
		isLoadingJwks = true;
		jwksError = '';
		try {
			const res = await fetch(jwksUrl.trim());
			if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal mengambil kunci JWKS`);
			const data = await res.json();
			jwksData = data;
			toast.success('JWKS Diperbarui', { description: `${data.keys?.length || 0} kunci publik diverifikasi.` });
		} catch (err) {
			jwksError = err.message;
			jwksData = null;
		} finally {
			isLoadingJwks = false;
		}
	}

	function decodeToken() {
		if (!testJwtToken.trim()) {
			toast.error('Token Kosong', { description: 'Masukkan JWT token terlebih dahulu.' });
			return;
		}

		try {
			const parts = testJwtToken.trim().split('.');
			if (parts.length < 2) throw new Error('Format JWT tidak valid (harus 3 bagian terpisah titik).');

			const header = JSON.parse(atob(parts[0]));
			const payload = JSON.parse(atob(parts[1]));

			decodedJwtHeader = header;
			decodedJwtPayload = payload;
			toast.success('Token Didekode', { description: 'Header & payload JWT berhasil dibaca.' });
		} catch (err) {
			toast.error('Gagal Mendekode JWT', { description: err.message });
			decodedJwtHeader = null;
			decodedJwtPayload = null;
		}
	}
</script>

<div class="space-y-6 w-full">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold tracking-tight text-neutral-900">Neon Auth & JWKS</h1>
				<Badge variant="secondary" class="bg-blue-50 text-blue-700 border-0 text-[10px] font-mono">
					OAuth 2.0 / OIDC
				</Badge>
			</div>
			<p class="text-xs text-neutral-500 mt-1 max-w-2xl">
				Infrastruktur autentikasi terdistribusi bawaan Neon. Mendukung verifikasi token JWT stateless melalui JSON Web Key Sets (JWKS) langsung dari edge.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="https://neon.com/docs/auth/overview"
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
			>
				<span>Dokumentasi Auth</span>
				<ExternalLinkIcon class="w-3.5 h-3.5" />
			</a>
		</div>
	</div>

	<!-- Configuration & Endpoints -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
		<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
			<Card.Title class="text-sm font-semibold text-neutral-900">Endpoint Neon Auth</Card.Title>

			<div class="space-y-3">
				<div>
					<label for="auth-base-url" class="block text-xs font-medium text-neutral-700 mb-1">
						Auth Base URL
					</label>
					<div class="relative">
						<Input
							id="auth-base-url"
							type="text"
							bind:value={authBaseUrl}
							class="text-xs font-mono border-neutral-200 pr-9"
						/>
						<button
							type="button"
							onclick={() => copyText(authBaseUrl, 'auth')}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 p-1 cursor-pointer"
							title="Salin Auth URL"
						>
							{#if copiedAuth}
								<CheckIcon class="w-3.5 h-3.5 text-emerald-600" />
							{:else}
								<CopyIcon class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
				</div>

				<div>
					<label for="jwks-url" class="block text-xs font-medium text-neutral-700 mb-1">
						Public JWKS URL (.well-known/jwks.json)
					</label>
					<div class="relative">
						<Input
							id="jwks-url"
							type="text"
							bind:value={jwksUrl}
							class="text-xs font-mono border-neutral-200 pr-9"
						/>
						<button
							type="button"
							onclick={() => copyText(jwksUrl, 'jwks')}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 p-1 cursor-pointer"
							title="Salin JWKS URL"
						>
							{#if copiedJwks}
								<CheckIcon class="w-3.5 h-3.5 text-emerald-600" />
							{:else}
								<CopyIcon class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
					<p class="text-[11px] text-neutral-400 mt-1">
						Digunakan oleh backend untuk memverifikasi signature token JWT dari pengguna tanpa perlu request ke database.
					</p>
				</div>

				<div class="pt-2 flex justify-end">
					<Button
						onclick={saveAuthSettings}
						class="text-xs bg-black hover:bg-neutral-800 text-white cursor-pointer"
					>
						Simpan Pengaturan Auth
					</Button>
				</div>
			</div>
		</Card.Root>

		<!-- Integration Snippet -->
		<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-3">
			<div class="flex items-center justify-between">
				<Card.Title class="text-sm font-semibold text-neutral-900">Verifikasi JWT di Server (jose)</Card.Title>
				<Badge variant="outline" class="text-[10px] font-mono border-neutral-200 text-neutral-600">Backend Guard</Badge>
			</div>

			<div class="bg-neutral-950 text-neutral-200 rounded-lg p-3 font-mono text-[11px] overflow-x-auto border border-neutral-800 space-y-1">
				<p class="text-neutral-500">// npm i jose</p>
				<p><span class="text-purple-400">import</span> &#123; createRemoteJWKSet, jwtVerify &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">'jose'</span>;</p>
				<br />
				<p><span class="text-blue-400">const</span> JWKS = <span class="text-yellow-300">createRemoteJWKSet</span>(<span class="text-purple-400">new</span> <span class="text-yellow-300">URL</span>(<span class="text-emerald-400">"{jwksUrl}"</span>));</p>
				<br />
				<p><span class="text-blue-400">export async function</span> <span class="text-yellow-300">verifyUserToken</span>(token) &#123;</p>
				<p class="pl-4"><span class="text-blue-400">const</span> &#123; payload &#125; = <span class="text-purple-400">await</span> <span class="text-yellow-300">jwtVerify</span>(token, JWKS);</p>
				<p class="pl-4"><span class="text-purple-400">return</span> payload;</p>
				<p>&#125;</p>
			</div>
		</Card.Root>
	</div>

	<!-- JWKS Public Keys Live Inspector -->
	<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
		<div class="flex items-center justify-between flex-wrap gap-2">
			<div>
				<Card.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
					<ShieldCheckIcon class="w-4 h-4 text-emerald-600" />
					<span>Inspektor Kunci Publik JWKS</span>
				</Card.Title>
				<Card.Description class="text-xs text-neutral-500">
					Kunci kriptografi publik yang aktif saat ini dari endpoint JWKS Neon.
				</Card.Description>
			</div>

			<Button
				variant="outline"
				size="sm"
				disabled={isLoadingJwks}
				onclick={fetchLiveJwks}
				class="text-xs border-neutral-200 hover:bg-neutral-50 cursor-pointer min-w-28 flex items-center justify-center"
			>
				{#if isLoadingJwks}
					<Spinner size="xs" class="text-neutral-700" />
				{:else}
					<RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" />
					<span>Segarkan Kunci</span>
				{/if}
			</Button>
		</div>

		{#if jwksError}
			<div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
				{jwksError}
			</div>
		{:else if jwksData?.keys}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				{#each jwksData.keys as key}
					<div class="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs space-y-1 font-mono">
						<div class="flex items-center justify-between">
							<span class="text-[11px] text-neutral-400">Key ID (kid):</span>
							<Badge variant="outline" class="text-[10px] bg-white border-neutral-200">{key.kid || '-'}</Badge>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-[11px] text-neutral-400">Algoritma (alg):</span>
							<span class="font-semibold text-neutral-800">{key.alg || 'RS256'}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-[11px] text-neutral-400">Key Type (kty):</span>
							<span class="text-neutral-700">{key.kty || 'RSA'}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-[11px] text-neutral-400">Use:</span>
							<span class="text-neutral-700">{key.use || 'sig'}</span>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="py-8 text-center text-xs text-neutral-400">
				Memuat kunci publik dari JWKS endpoint...
			</div>
		{/if}
	</Card.Root>

	<!-- JWT Decoder Tester -->
	<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
		<div>
			<Card.Title class="text-sm font-semibold text-neutral-900">Uji Dekode JWT Token</Card.Title>
			<Card.Description class="text-xs text-neutral-500">
				Tempelkan bearer token JWT untuk memeriksa isi klaim dan integritas header.
			</Card.Description>
		</div>

		<div class="flex gap-2 items-start">
			<Input
				placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
				bind:value={testJwtToken}
				class="text-xs font-mono border-neutral-200 flex-1"
			/>
			<Button
				onclick={decodeToken}
				class="text-xs bg-black hover:bg-neutral-800 text-white cursor-pointer shrink-0"
			>
				Dekode
			</Button>
		</div>

		{#if decodedJwtPayload}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
				<div class="bg-neutral-950 text-neutral-200 p-3 rounded-lg text-xs font-mono">
					<p class="text-neutral-400 text-[10px] mb-1 font-semibold uppercase">Header</p>
					<pre class="overflow-x-auto text-[11px] text-blue-300">{JSON.stringify(decodedJwtHeader, null, 2)}</pre>
				</div>
				<div class="bg-neutral-950 text-neutral-200 p-3 rounded-lg text-xs font-mono">
					<p class="text-neutral-400 text-[10px] mb-1 font-semibold uppercase">Payload / Claims</p>
					<pre class="overflow-x-auto text-[11px] text-emerald-300">{JSON.stringify(decodedJwtPayload, null, 2)}</pre>
				</div>
			</div>
		{/if}
	</Card.Root>
</div>

