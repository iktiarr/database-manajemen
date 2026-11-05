<script>
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	let { form } = $props();
	let loading = $state(false);
	let showPassword = $state(false);
</script>

<div class="min-h-screen bg-slate-50/60 text-slate-900 flex items-center justify-center p-4">
	<div class="w-full max-w-sm space-y-6">
		<!-- Brand Header -->
		<div class="text-center space-y-2">
			<Avatar.Root class="mx-auto w-12 h-12 bg-emerald-50 border border-emerald-100 shadow-xs">
				<Avatar.Fallback class="text-emerald-700 font-bold text-sm bg-emerald-50">
					DG
				</Avatar.Fallback>
			</Avatar.Root>
			<div>
				<h1 class="text-xl font-bold tracking-tight text-slate-900">Database Gateway</h1>
				<p class="text-xs text-slate-400 mt-0.5">Management Console & API Universal</p>
			</div>
			<div>
				<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 font-mono text-[10px]">
					Neon PostgreSQL
				</Badge>
			</div>
		</div>

		<!-- Login Card (Shadcn Card) -->
		<Card.Root class="border border-slate-100 shadow-lg rounded-2xl bg-white p-6 space-y-4">
			{#if form?.error}
				<Alert.Root variant="destructive" class="rounded-xl border-0 bg-rose-50 text-rose-800 p-3">
					<Alert.Description class="text-xs font-medium">{form.error}</Alert.Description>
				</Alert.Root>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-1.5">
					<label for="email" class="block text-xs font-medium text-slate-700">
						Email Master Admin
					</label>
					<Input
						type="email"
						id="email"
						name="email"
						required
						autocomplete="email"
						placeholder="admin@example.com"
						class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="password" class="block text-xs font-medium text-slate-700">
						Password
					</label>
					<div class="relative">
						<Input
							type={showPassword ? 'text' : 'password'}
							id="password"
							name="password"
							required
							autocomplete="current-password"
							placeholder="••••••••••••"
							class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg pr-9"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
							title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
							aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
						>
							{#if showPassword}
								<EyeOffIcon class="w-4 h-4" />
							{:else}
								<EyeIcon class="w-4 h-4" />
							{/if}
						</button>
					</div>
				</div>

				<Button
					type="submit"
					disabled={loading}
					class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2.5 rounded-lg shadow-xs transition cursor-pointer"
				>
					{#if loading}
						<span>Memverifikasi...</span>
					{:else}
						<span>Masuk ke Dashboard</span>
					{/if}
				</Button>
			</form>
		</Card.Root>

		<!-- Footer Info -->
		<p class="text-center text-[11px] text-slate-400 font-mono">
			Secured by Neon Cloud PostgreSQL & SvelteKit
		</p>
	</div>
</div>
