<script>
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	let { form } = $props();
	let loading = $state(false);
	let showPassword = $state(false);
</script>

<div class="min-h-screen bg-neutral-50/60 text-neutral-900 flex items-center justify-center p-4">
	<div class="w-full max-w-sm space-y-5">
		<!-- Judul & Deskripsi Singkat -->
		<div class="text-center space-y-1">
			<h1 class="text-xl font-semibold tracking-tight text-neutral-900">Database Gateway</h1>
			<p class="text-xs text-neutral-500">Konsol Manajemen</p>
		</div>

		<!-- Form Login -->
		<Card.Root class="border border-neutral-200 shadow-sm rounded-xl bg-white p-6 space-y-4">
			{#if form?.error}
				<Alert.Root variant="destructive" class="rounded-lg border-0 bg-rose-50 text-rose-800 p-3">
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
					<label for="email" class="block text-xs font-medium text-neutral-700">
						Email
					</label>
					<Input
						type="email"
						id="email"
						name="email"
						required
						autocomplete="email"
						placeholder="admin@example.com"
						class="border-neutral-200 text-xs rounded-lg"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="password" class="block text-xs font-medium text-neutral-700">
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
							class="border-neutral-200 text-xs rounded-lg pr-9"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
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
					class="w-full bg-black hover:bg-neutral-800 text-white font-medium text-xs py-2.5 rounded-lg shadow-xs transition cursor-pointer"
				>
					{#if loading}
						<span>Memverifikasi...</span>
					{:else}
						<span>Masuk</span>
					{/if}
				</Button>
			</form>
		</Card.Root>
	</div>
</div>
