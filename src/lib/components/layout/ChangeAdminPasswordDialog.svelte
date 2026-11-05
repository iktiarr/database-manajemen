<script>
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import KeyIcon from '@lucide/svelte/icons/key';
	import LockIcon from '@lucide/svelte/icons/lock';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';

	let { open = $bindable(false), currentAdmin = null } = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);
	let feedback = $state({ type: '', message: '' });

	function resetForm() {
		newPassword = '';
		confirmPassword = '';
		showPassword = false;
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
					message: 'Password berhasil diperbarui! Anda akan diarahkan ke halaman login...'
				};
				setTimeout(() => {
					window.location.href = '/login';
				}, 1200);
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
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-2xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1.5 pb-2 border-b border-slate-100">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
					<KeyIcon class="w-4 h-4" />
				</div>
				<div>
					<Dialog.Title class="text-base font-bold text-slate-900">Ubah Password Master Admin</Dialog.Title>
					<Dialog.Description class="text-xs text-slate-400">
						Ganti password akun login ({currentAdmin?.email || 'Admin'})
					</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		{#if feedback.message}
			<Alert.Root
				class="my-3 text-xs {feedback.type === 'error'
					? 'bg-rose-50/60 border-rose-200 text-rose-800'
					: 'bg-emerald-50/60 border-emerald-200 text-emerald-800'}"
			>
				<Alert.Description class="flex items-center gap-1.5">
					<ShieldAlertIcon class="w-3.5 h-3.5 shrink-0" />
					<span>{feedback.message}</span>
				</Alert.Description>
			</Alert.Root>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-3.5 pt-2">
			<div>
				<label for="admin-curr-email" class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
					Akun Master Admin
				</label>
				<Input
					id="admin-curr-email"
					type="text"
					value={currentAdmin?.email || ''}
					disabled
					class="text-xs bg-slate-50 text-slate-600 font-mono border-slate-200"
				/>
			</div>

			<div>
				<label for="new-admin-pw" class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
					Password Baru (Min. 6 Karakter)
				</label>
				<div class="relative">
					<Input
						id="new-admin-pw"
						type={showPassword ? 'text' : 'password'}
						placeholder="Masukkan password baru..."
						bind:value={newPassword}
						required
						minlength="6"
						class="text-xs pr-9 font-mono"
					/>
					<button
						type="button"
						onclick={() => (showPassword = !showPassword)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
					>
						{#if showPassword}
							<EyeOffIcon class="w-3.5 h-3.5" />
						{:else}
							<EyeIcon class="w-3.5 h-3.5" />
						{/if}
					</button>
				</div>
			</div>

			<div>
				<label for="confirm-admin-pw" class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
					Konfirmasi Password Baru
				</label>
				<Input
					id="confirm-admin-pw"
					type={showPassword ? 'text' : 'password'}
					placeholder="Ulangi password baru..."
					bind:value={confirmPassword}
					required
					minlength="6"
					class="text-xs font-mono"
				/>
			</div>

			<div class="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-800 space-y-1">
				<p class="font-semibold flex items-center gap-1.5">
					<LockIcon class="w-3 h-3 text-amber-600 shrink-0" />
					Penting:
				</p>
				<p class="text-amber-700/90 leading-relaxed">
					Setelah password diperbarui, Anda akan otomatis logout demi keamanan dan perlu login kembali dengan password baru.
				</p>
			</div>

			<Dialog.Footer class="pt-2 flex justify-end gap-2 border-t border-slate-100">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="text-xs border-slate-200"
					onclick={() => (open = false)}
				>
					Batal
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
					class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
				>
					{isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
