<script>
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	let { open = $bindable(false), currentAdmin = null } = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);
	let feedback = $state({ type: '', message: '' });

	function resetForm() {
		newPassword = '';
		confirmPassword = '';
		showNewPassword = false;
		showConfirmPassword = false;
		feedback = { type: '', message: '' };
	}

	async function handleSubmit(e) {
		e.preventDefault();
		feedback = { type: '', message: '' };

		if (!currentAdmin?.id) {
			feedback = { type: 'error', message: 'Sesi admin tidak terdeteksi. Silakan muat ulang halaman.' };
			return;
		}

		if (newPassword.trim().length < 6) {
			feedback = { type: 'error', message: 'Password baru minimal 6 karakter.' };
			return;
		}

		if (newPassword !== confirmPassword) {
			feedback = { type: 'error', message: 'Konfirmasi password tidak cocok.' };
			return;
		}

		isSubmitting = true;
		try {
			const formBody = new URLSearchParams();
			formBody.set('id', String(currentAdmin.id));
			formBody.set('email', currentAdmin.email);
			formBody.set('role', currentAdmin.role || 'superadmin');
			formBody.set('password', newPassword.trim());

			const res = await fetch('?/updateAdmin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: formBody.toString()
			});

			if (res.ok) {
				feedback = {
					type: 'success',
					message: 'Password berhasil diperbarui. Mengalihkan ke login...'
				};
				setTimeout(() => {
					window.location.href = '/login';
				}, 1000);
			} else {
				feedback = { type: 'error', message: 'Gagal memperbarui password admin.' };
			}
		} catch (err) {
			feedback = { type: 'error', message: err.message || 'Terjadi kesalahan sistem.' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(val) => { if (!val) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md bg-white border border-neutral-200 shadow-xl rounded-xl p-6">
		<Dialog.Header class="pb-2 border-b border-neutral-100">
			<Dialog.Title class="text-sm font-semibold text-neutral-900">Ubah Password Master Admin</Dialog.Title>
			<Dialog.Description class="text-xs text-neutral-500">
				{currentAdmin?.email || 'Admin'}
			</Dialog.Description>
		</Dialog.Header>

		{#if feedback.message}
			<Alert.Root
				class="my-3 text-xs {feedback.type === 'error'
					? 'bg-rose-50 border-rose-200 text-rose-800'
					: 'bg-neutral-100 border-neutral-200 text-neutral-900'}"
			>
				<Alert.Description>
					{feedback.message}
				</Alert.Description>
			</Alert.Root>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-4 pt-2">
			<div>
				<label for="admin-email-field" class="text-xs text-neutral-600 block mb-1">
					Email Admin
				</label>
				<Input
					id="admin-email-field"
					type="text"
					value={currentAdmin?.email || ''}
					disabled
					class="text-xs bg-neutral-50 text-neutral-500 border-neutral-200"
				/>
			</div>

			<div>
				<label for="admin-new-pw" class="text-xs text-neutral-600 block mb-1">
					Password Baru (Min. 6 Karakter)
				</label>
				<div class="relative">
					<Input
						id="admin-new-pw"
						type={showNewPassword ? 'text' : 'password'}
						placeholder="Masukkan password baru..."
						bind:value={newPassword}
						required
						minlength="6"
						class="text-xs border-neutral-200 pr-9"
					/>
					<button
						type="button"
						onclick={() => (showNewPassword = !showNewPassword)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
						title={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
						aria-label={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
					>
						{#if showNewPassword}
							<EyeOffIcon class="w-4 h-4" />
						{:else}
							<EyeIcon class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>

			<div>
				<label for="admin-confirm-pw" class="text-xs text-neutral-600 block mb-1">
					Konfirmasi Password Baru
				</label>
				<div class="relative">
					<Input
						id="admin-confirm-pw"
						type={showConfirmPassword ? 'text' : 'password'}
						placeholder="Ulangi password baru..."
						bind:value={confirmPassword}
						required
						minlength="6"
						class="text-xs border-neutral-200 pr-9"
					/>
					<button
						type="button"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
						title={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
						aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
					>
						{#if showConfirmPassword}
							<EyeOffIcon class="w-4 h-4" />
						{:else}
							<EyeIcon class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>

			<Dialog.Footer class="pt-3 flex justify-end gap-2 border-t border-neutral-100">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50"
					onclick={() => (open = false)}
				>
					Batal
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
					class="text-xs bg-black text-white hover:bg-neutral-800"
				>
					{isSubmitting ? 'Menyimpan...' : 'Simpan'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
