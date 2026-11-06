<script>
	import { invalidateAll } from '$app/navigation';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	let {
		admins = $bindable([]),
		currentAdmin = null
	} = $props();

	const roleOptions = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'superadmin', label: 'Superadmin' }
	];

	// Dialog States
	let showCreateAdminDialog = $state(false);
	let newAdminEmail = $state('');
	let newAdminPassword = $state('');
	let showNewPassword = $state(false);
	let newAdminRole = $state('admin');
	let isCreatingAdmin = $state(false);
	let adminFeedback = $state({ type: '', text: '' });

	let showEditAdminDialog = $state(false);
	let showDeleteAdminDialog = $state(false);
	let selectedAdmin = $state(null);
	let editEmail = $state('');
	let editRole = $state('admin');
	let editPassword = $state('');
	let showEditPassword = $state(false);
	let isUpdatingAdmin = $state(false);
	let isDeletingAdmin = $state(false);
	let editFeedback = $state('');
	let deleteFeedback = $state('');

	function getInitials(email = '') {
		if (!email) return 'AD';
		const clean = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
		if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
		return clean.toUpperCase() || 'AD';
	}

	function isSelf(admin) {
		if (!currentAdmin || !admin) return false;
		if (currentAdmin.id && admin.id && String(currentAdmin.id) === String(admin.id)) {
			return true;
		}
		if (
			currentAdmin.email &&
			admin.email &&
			currentAdmin.email.toLowerCase() === admin.email.toLowerCase()
		) {
			return true;
		}
		return false;
	}

	async function handleCreateAdmin(e) {
		e.preventDefault();
		adminFeedback = { type: '', text: '' };

		if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
			toast.error('Data Belum Lengkap', { description: 'Email dan password wajib diisi.' });
			return;
		}

		isCreatingAdmin = true;
		try {
			const formBody = new URLSearchParams();
			formBody.set('email', newAdminEmail.trim());
			formBody.set('password', newAdminPassword.trim());
			formBody.set('role', newAdminRole);

			const res = await fetch('?/createAdmin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: formBody.toString()
			});

			if (res.ok) {
				toast.success('Admin Ditambahkan', { description: `Admin "${newAdminEmail}" berhasil dibuat.` });
				showCreateAdminDialog = false;
				newAdminEmail = '';
				newAdminPassword = '';
				showNewPassword = false;
				newAdminRole = 'admin';
				await invalidateAll();
			} else {
				toast.error('Gagal Menambahkan Admin', { description: 'Email mungkin sudah terdaftar.' });
			}
		} catch (err) {
			toast.error('Terjadi Kesalahan', { description: err.message });
		} finally {
			isCreatingAdmin = false;
		}
	}

	function openEditModal(admin) {
		selectedAdmin = admin;
		editEmail = admin.email;
		editRole = admin.role;
		editPassword = '';
		showEditPassword = false;
		editFeedback = '';
		showEditAdminDialog = true;
	}

	async function handleUpdateAdmin(e) {
		e.preventDefault();
		if (!selectedAdmin) return;
		isUpdatingAdmin = true;
		editFeedback = '';

		const isUpdatingSelf = isSelf(selectedAdmin);

		try {
			const formBody = new URLSearchParams();
			formBody.set('id', String(selectedAdmin.id));
			formBody.set('email', editEmail.trim());
			formBody.set('role', editRole);
			if (editPassword.trim()) {
				formBody.set('password', editPassword.trim());
			}

			const res = await fetch('?/updateAdmin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: formBody.toString()
			});

			if (res.ok) {
				if (isUpdatingSelf) {
					toast.success('Profil Diperbarui', { description: 'Mengalihkan ke halaman login' });
					setTimeout(() => {
						window.location.href = '/login';
					}, 1000);
					return;
				}
				selectedAdmin.email = editEmail.trim();
				selectedAdmin.role = editRole;
				showEditAdminDialog = false;
				toast.success('Admin Diperbarui', { description: 'Perubahan berhasil disimpan.' });
				await invalidateAll();
			} else {
				toast.error('Gagal Memperbarui', { description: 'Tidak dapat memperbarui data admin.' });
			}
		} catch (err) {
			toast.error('Terjadi Kesalahan', { description: err.message });
		} finally {
			isUpdatingAdmin = false;
		}
	}

	function openDeleteModal(admin) {
		selectedAdmin = admin;
		deleteFeedback = '';
		showDeleteAdminDialog = true;
	}

	async function handleDeleteAdmin() {
		if (!selectedAdmin) return;
		if (isSelf(selectedAdmin)) {
			toast.error('Aksi Ditolak', { description: 'Anda tidak dapat menghapus akun sendiri.' });
			return;
		}
		isDeletingAdmin = true;
		deleteFeedback = '';

		try {
			const formBody = new URLSearchParams();
			formBody.set('id', String(selectedAdmin.id));

			const res = await fetch('?/deleteAdmin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: formBody.toString()
			});

			if (res.ok) {
				admins = admins.filter((a) => a.id !== selectedAdmin.id);
				showDeleteAdminDialog = false;
				selectedAdmin = null;
				toast.success('Admin Dihapus', { description: 'Akun admin berhasil dihapus.' });
			} else {
				toast.error('Gagal Menghapus', { description: 'Tidak dapat menghapus admin.' });
			}
		} catch (err) {
			toast.error('Terjadi Kesalahan', { description: err.message });
		} finally {
			isDeletingAdmin = false;
		}
	}

	async function handleToggleStatus(admin) {
		if (isSelf(admin)) {
			toast.error('Aksi Ditolak', { description: 'Akun sendiri tidak dapat dinonaktifkan.' });
			return;
		}

		const previousStatus = admin.is_active;
		admin.is_active = !admin.is_active;

		try {
			const formBody = new URLSearchParams();
			formBody.set('id', String(admin.id));

			const res = await fetch('?/toggleAdminStatus', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: formBody.toString()
			});

			if (!res.ok) {
				admin.is_active = previousStatus;
				toast.error('Gagal Mengubah Status', { description: 'Gagal memperbarui status admin.' });
			} else {
				toast.success('Status Diperbarui', { description: `Admin sekarang ${admin.is_active ? 'Aktif' : 'Nonaktif'}.` });
			}
		} catch {
			admin.is_active = previousStatus;
			toast.error('Kesalahan Jaringan', { description: 'Gagal menghubungi server.' });
		}
	}
</script>

<div class="space-y-6 w-full">
	<!-- Judul Halaman & Tombol Tambah Admin -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<h2 class="text-xl font-bold tracking-tight text-slate-900">Tabel Master Admin</h2>
			<p class="text-xs text-slate-400 mt-0.5">Kelola pengguna master, status aktif, hak akses role, dan tindakan akun</p>
		</div>

		<Button
			size="sm"
			onclick={() => {
				adminFeedback = { type: '', text: '' };
				showNewPassword = false;
				showCreateAdminDialog = true;
			}}
			class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
		>
			+ Tambah Admin
		</Button>
	</div>

	<!-- Tabel Admin (Card + Avatar + Badges) -->
	<Card.Root class="border border-slate-100 shadow-xs rounded-2xl overflow-hidden bg-white">
		<Table.Root>
			<Table.Header class="bg-slate-50/50">
				<Table.Row>
					<Table.Head class="w-14">No</Table.Head>
					<Table.Head>Pengguna / Email</Table.Head>
					<Table.Head>Role</Table.Head>
					<Table.Head>Terdaftar</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each admins as admin, i}
					<Table.Row>
						<!-- Nomor -->
						<Table.Cell class="font-mono text-xs text-slate-400">{i + 1}</Table.Cell>

						<!-- Email dengan Avatar Inisial & Badge Anda -->
						<Table.Cell class="text-xs font-semibold text-slate-900">
							<div class="flex items-center gap-2.5">
								<Avatar.Root class="w-7 h-7 rounded-full border border-slate-200 bg-white">
									<Avatar.Fallback class="bg-slate-100 text-slate-700 font-bold text-[10px]">
										{getInitials(admin.email)}
									</Avatar.Fallback>
								</Avatar.Root>
								<span>{admin.email}</span>
								{#if isSelf(admin)}
									<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-medium px-2 py-0.2">
										Anda
									</Badge>
								{/if}
							</div>
						</Table.Cell>

						<!-- Role Badge -->
						<Table.Cell>
							<Badge variant="outline" class="font-mono text-xs font-normal border-slate-200 text-slate-700 capitalize">
								{admin.role}
							</Badge>
						</Table.Cell>

						<!-- Terdaftar Pada -->
						<Table.Cell class="text-xs text-slate-500 font-mono">
							{new Date(admin.created_at).toLocaleDateString('id-ID', {
								day: '2-digit',
								month: '2-digit',
								year: 'numeric'
							})} {new Date(admin.created_at).toLocaleTimeString('id-ID', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</Table.Cell>

						<!-- Status Badge -->
						<Table.Cell>
							{#if admin.is_active}
								<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
									Aktif
								</Badge>
							{:else}
								<Badge variant="secondary" class="bg-slate-100 text-slate-500 border-0 text-xs font-medium">
									<span class="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
									Nonaktif
								</Badge>
							{/if}
						</Table.Cell>

						<!-- Aksi -->
						<Table.Cell class="text-right">
							<div class="inline-flex items-center gap-1 justify-end">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => openEditModal(admin)}
									class="text-xs font-medium text-slate-600 hover:text-slate-900"
								>
									Edit
								</Button>

								{#if !isSelf(admin)}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleToggleStatus(admin)}
										class="text-xs font-medium {admin.is_active ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}"
									>
										{admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
									</Button>

									<Button
										variant="ghost"
										size="sm"
										onclick={() => openDeleteModal(admin)}
										class="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50"
									>
										Hapus
									</Button>
								{:else}
									<span class="text-xs text-slate-400 font-normal px-2.5 py-1 select-none">
										(Akun Anda)
									</span>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Root>
</div>

<!-- ============================================== -->
<!-- DIALOG: TAMBAH ADMIN BARU                      -->
<!-- ============================================== -->
<Dialog.Root bind:open={showCreateAdminDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">Tambah Master Admin Baru</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				Masukkan data akun admin yang akan diberikan hak akses manajemen ke database.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreateAdmin} class="space-y-4 pt-2">
			<div>
				<label for="new-email" class="block text-xs font-medium text-slate-700 mb-1.5">Email Admin</label>
				<Input
					id="new-email"
					type="email"
					bind:value={newAdminEmail}
					required
					placeholder="admin@domain.com"
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
			</div>

			<div>
				<label for="new-password" class="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
				<div class="relative">
					<Input
						id="new-password"
						type={showNewPassword ? 'text' : 'password'}
						bind:value={newAdminPassword}
						required
						placeholder="Minimal 6 karakter..."
						class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg pr-9"
					/>
					<button
						type="button"
						onclick={() => (showNewPassword = !showNewPassword)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
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
				<label for="new-role" class="block text-xs font-medium text-slate-700 mb-1.5">Role / Hak Akses</label>
				<Combobox
					id="new-role"
					bind:value={newAdminRole}
					options={roleOptions}
					placeholder="Pilih Role"
				/>
			</div>

			{#if adminFeedback.text}
				<Alert.Root variant={adminFeedback.type === 'success' ? 'default' : 'destructive'} class="rounded-xl border-0 bg-slate-50">
					<Alert.Description class="text-xs">{adminFeedback.text}</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="pt-3 flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					onclick={() => (showCreateAdminDialog = false)}
					class="text-xs text-slate-600 hover:text-slate-900"
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isCreatingAdmin}
					class="text-xs bg-black hover:bg-neutral-800 text-white font-medium min-w-24 flex items-center justify-center"
				>
					{#if isCreatingAdmin}
						<Spinner size="xs" class="text-white" />
					{:else}
						Simpan Admin
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- DIALOG: EDIT ADMIN                             -->
<!-- ============================================== -->
<Dialog.Root bind:open={showEditAdminDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">
				{isSelf(selectedAdmin) ? 'Edit Akun Saya' : 'Edit Data Admin'}
			</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				{#if isSelf(selectedAdmin)}
					Perbarui data akun Anda. Menyimpan perubahan akan mengakhiri sesi dan memerlukan login ulang.
				{:else}
					Perbarui email, role, atau ganti password untuk admin ini.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleUpdateAdmin} class="space-y-4 pt-2">
			{#if isSelf(selectedAdmin)}
				<Alert.Root class="rounded-xl border border-amber-200/80 bg-amber-50/70 text-amber-800 p-2.5">
					<Alert.Description class="text-[11px] leading-relaxed">
						Perhatian: Menyimpan perubahan pada akun sendiri akan otomatis mengeluarkan Anda (logout) demi keamanan, dan Anda perlu login ulang dengan data terbaru.
					</Alert.Description>
				</Alert.Root>
			{/if}
			<div>
				<label for="edit-email" class="block text-xs font-medium text-slate-700 mb-1.5">Email Admin</label>
				<Input
					id="edit-email"
					type="email"
					bind:value={editEmail}
					required
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
			</div>

			<div>
				<label for="edit-role" class="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
				<Combobox
					id="edit-role"
					bind:value={editRole}
					options={roleOptions}
					placeholder="Pilih Role"
				/>
			</div>

			<div>
				<label for="edit-password" class="block text-xs font-medium text-slate-700 mb-1.5">
					Password Baru (Kosongkan jika tidak diubah)
				</label>
				<div class="relative">
					<Input
						id="edit-password"
						type={showEditPassword ? 'text' : 'password'}
						bind:value={editPassword}
						placeholder="••••••••"
						class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg pr-9"
					/>
					<button
						type="button"
						onclick={() => (showEditPassword = !showEditPassword)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
						title={showEditPassword ? 'Sembunyikan password' : 'Lihat password'}
						aria-label={showEditPassword ? 'Sembunyikan password' : 'Lihat password'}
					>
						{#if showEditPassword}
							<EyeOffIcon class="w-4 h-4" />
						{:else}
							<EyeIcon class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>

			{#if editFeedback}
				<Alert.Root variant="destructive" class="rounded-xl border-0 bg-rose-50 text-rose-800">
					<Alert.Description class="text-xs">{editFeedback}</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="pt-3 flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					onclick={() => (showEditAdminDialog = false)}
					class="text-xs text-slate-600 hover:text-slate-900"
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isUpdatingAdmin}
					class="text-xs bg-black hover:bg-neutral-800 text-white font-medium min-w-28 flex items-center justify-center"
				>
					{#if isUpdatingAdmin}
						<Spinner size="xs" class="text-white" />
					{:else}
						{isSelf(selectedAdmin) ? 'Simpan & Login Ulang' : 'Simpan Perubahan'}
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- ALERT DIALOG: KONFIRMASI HAPUS ADMIN           -->
<!-- ============================================== -->
<AlertDialog.Root bind:open={showDeleteAdminDialog}>
	<AlertDialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<AlertDialog.Header class="space-y-1">
			<AlertDialog.Title class="text-base font-bold text-slate-900">Hapus Akun Admin?</AlertDialog.Title>
			<AlertDialog.Description class="text-xs text-slate-400">
				Apakah Anda yakin ingin menghapus admin <strong>{selectedAdmin?.email}</strong>? Tindakan ini permanen.
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if deleteFeedback}
			<Alert.Root variant="destructive" class="rounded-xl border-0 bg-rose-50 text-rose-800 my-2">
				<Alert.Description class="text-xs">{deleteFeedback}</Alert.Description>
			</Alert.Root>
		{/if}

		<AlertDialog.Footer class="pt-4 flex justify-end gap-2">
			<AlertDialog.Cancel class="text-xs border-slate-200">
				Batal
			</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDeleteAdmin}
				disabled={isDeletingAdmin}
				class="text-xs bg-rose-600 hover:bg-rose-700 text-white min-w-28 flex items-center justify-center"
			>
				{#if isDeletingAdmin}
					<Spinner size="xs" class="text-white" />
				{:else}
					Ya, Hapus Admin
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

