<script>
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as HoverCard from '$lib/components/ui/hover-card/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	let { data } = $props();

	// Navigation tab state
	let activeTab = $state('databases'); // 'databases' | 'query' | 'admins' | 'settings'

	const roleOptions = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'superadmin', label: 'Superadmin' }
	];

	function setActiveTab(tab) {
		activeTab = tab;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('app_active_tab', tab);
		}
	}

	// Logout confirmation dialog state
	let showLogoutConfirm = $state(false);

	// Master Key state
	let masterKey = $state('');
	let showKey = $state(false);
	let keySavedNotice = $state(false);

	// Databases state
	let databases = $state([]);
	let isRefreshingDbs = $state(false);
	let searchDb = $state('');
	let newDbName = $state('');
	let isCreatingDb = $state(false);
	let dbFeedback = $state({ type: '', text: '' });
	let showCreateDbDialog = $state(false);

	// Query Runner state
	let selectedDb = $state('neondb');
	let sqlQuery = $state('SELECT datname, encoding FROM pg_database LIMIT 5;');
	let sqlParams = $state('[]');
	let isExecuting = $state(false);
	let queryResult = $state(null);
	let queryDuration = $state(null);
	let codeTab = $state('curl'); // 'curl' | 'fetch'
	let copiedCode = $state(false);

	// Admins state
	let admins = $state([]);
	let showCreateAdminDialog = $state(false);
	let newAdminEmail = $state('');
	let newAdminPassword = $state('');
	let newAdminRole = $state('admin');
	let isCreatingAdmin = $state(false);
	let adminFeedback = $state({ type: '', text: '' });

	// Edit & Delete Admin state
	let showEditAdminDialog = $state(false);
	let showDeleteAdminDialog = $state(false);
	let selectedAdmin = $state(null);
	let editEmail = $state('');
	let editRole = $state('admin');
	let editPassword = $state('');
	let isUpdatingAdmin = $state(false);
	let isDeletingAdmin = $state(false);
	let editFeedback = $state('');
	let deleteFeedback = $state('');

	// Init onMount
	onMount(() => {
		const saved = localStorage.getItem('app_master_key');
		if (saved) {
			masterKey = saved;
		}
		const savedTab = localStorage.getItem('app_active_tab');
		if (savedTab && ['databases', 'query', 'admins', 'settings'].includes(savedTab)) {
			activeTab = savedTab;
		}
	});

	$effect(() => {
		if (data?.databases) {
			databases = data.databases;
			if (data.databases[0] && selectedDb === 'neondb') {
				selectedDb = data.databases[0].name;
			}
		}
		if (data?.admins) {
			admins = data.admins;
		}
	});

	function getInitials(email = '') {
		if (!email) return 'AD';
		const clean = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
		if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
		return clean.toUpperCase() || 'AD';
	}

	function isSelf(admin) {
		if (!data?.currentAdmin || !admin) return false;
		if (data.currentAdmin.id && admin.id && String(data.currentAdmin.id) === String(admin.id)) {
			return true;
		}
		if (
			data.currentAdmin.email &&
			admin.email &&
			data.currentAdmin.email.toLowerCase() === admin.email.toLowerCase()
		) {
			return true;
		}
		return false;
	}

	function saveMasterKey() {
		localStorage.setItem('app_master_key', masterKey);
		keySavedNotice = true;
		setTimeout(() => {
			keySavedNotice = false;
		}, 2000);
	}

	async function refreshDatabases() {
		if (!masterKey.trim()) return;
		isRefreshingDbs = true;
		try {
			const res = await fetch('/api/databases', {
				headers: {
					Authorization: `Bearer ${masterKey.trim()}`
				}
			});
			const result = await res.json();
			if (res.ok && result.databases) {
				databases = result.databases;
			}
		} catch (err) {
			console.error('Refresh databases error:', err);
		} finally {
			isRefreshingDbs = false;
		}
	}

	async function handleCreateDatabase(e) {
		e.preventDefault();
		dbFeedback = { type: '', text: '' };

		if (!masterKey.trim()) {
			dbFeedback = { type: 'error', text: 'Master API Key belum diatur. Atur di menu Settings.' };
			return;
		}

		const cleanName = newDbName.trim();
		if (!cleanName || !/^[a-zA-Z0-9_]+$/.test(cleanName)) {
			dbFeedback = {
				type: 'error',
				text: 'Nama database harus berupa huruf, angka, atau underscore (/^[a-zA-Z0-9_]+$/).'
			};
			return;
		}

		isCreatingDb = true;

		try {
			const res = await fetch('/api/databases', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${masterKey.trim()}`
				},
				body: JSON.stringify({ dbName: cleanName })
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result.error || 'Gagal membuat database.');
			}

			dbFeedback = { type: 'success', text: `Database "${cleanName}" berhasil dibuat di Neon Cloud!` };
			newDbName = '';
			showCreateDbDialog = false;
			await refreshDatabases();
		} catch (err) {
			dbFeedback = { type: 'error', text: err.message };
		} finally {
			isCreatingDb = false;
		}
	}

	async function handleExecuteQuery() {
		queryResult = null;
		queryDuration = null;

		if (!masterKey.trim()) {
			queryResult = { error: 'Master API Key belum diatur. Harap masukkan Master API Key di Settings.' };
			return;
		}

		if (!sqlQuery.trim()) {
			queryResult = { error: 'Query SQL tidak boleh kosong.' };
			return;
		}

		let parsedParams = [];
		if (sqlParams.trim()) {
			try {
				parsedParams = JSON.parse(sqlParams);
				if (!Array.isArray(parsedParams)) {
					queryResult = { error: 'Parameter harus berformat JSON Array, contoh: ["val1", 2]' };
					return;
				}
			} catch {
				queryResult = { error: 'Format JSON Parameter tidak valid.' };
				return;
			}
		}

		isExecuting = true;
		const start = performance.now();

		try {
			const res = await fetch('/api/query', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${masterKey.trim()}`,
					'x-database-name': selectedDb
				},
				body: JSON.stringify({
					sql: sqlQuery,
					params: parsedParams
				})
			});

			const dataRes = await res.json();
			const end = performance.now();
			queryDuration = (end - start).toFixed(1);

			if (!res.ok) {
				queryResult = { error: dataRes.error || 'Terjadi kesalahan eksekusi query' };
			} else {
				queryResult = {
					rows: dataRes.rows || [],
					rowCount: dataRes.rowCount ?? 0
				};
			}
		} catch (err) {
			queryResult = { error: err.message || 'Gagal terhubung ke API gateway' };
		} finally {
			isExecuting = false;
		}
	}

	async function handleCreateAdmin(e) {
		e.preventDefault();
		adminFeedback = { type: '', text: '' };

		if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
			adminFeedback = { type: 'error', text: 'Email dan password wajib diisi.' };
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
				showCreateAdminDialog = false;
				newAdminEmail = '';
				newAdminPassword = '';
				newAdminRole = 'admin';
				setActiveTab('admins');
				await invalidateAll();
			} else {
				adminFeedback = { type: 'error', text: 'Gagal menambahkan admin.' };
			}
		} catch (err) {
			adminFeedback = { type: 'error', text: err.message };
		} finally {
			isCreatingAdmin = false;
		}
	}

	function openEditModal(admin) {
		selectedAdmin = admin;
		editEmail = admin.email;
		editRole = admin.role;
		editPassword = '';
		editFeedback = '';
		showEditAdminDialog = true;
	}

	async function handleUpdateAdmin(e) {
		e.preventDefault();
		if (!selectedAdmin) return;
		isUpdatingAdmin = true;
		editFeedback = '';

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
				selectedAdmin.email = editEmail.trim();
				selectedAdmin.role = editRole;
				showEditAdminDialog = false;
			} else {
				editFeedback = 'Gagal memperbarui data admin.';
			}
		} catch (err) {
			editFeedback = err.message;
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
			deleteFeedback = 'Anda tidak dapat menghapus akun sendiri saat sedang login.';
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
			} else {
				deleteFeedback = 'Gagal menghapus admin.';
			}
		} catch (err) {
			deleteFeedback = err.message;
		} finally {
			isDeletingAdmin = false;
		}
	}

	async function handleToggleStatus(admin) {
		if (isSelf(admin)) {
			alert('Akun yang sedang login tidak dapat menonaktifkan dirinya sendiri demi keamanan.');
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
			}
		} catch {
			admin.is_active = previousStatus;
		}
	}

	function selectDbForQuery(dbName) {
		selectedDb = dbName;
		setActiveTab('query');
	}

	// Dynamic Snippets
	let effectiveKey = $derived(masterKey.trim() || '<APP_MASTER_KEY>');

	let curlSnippet = $derived(`curl -X POST https://your-domain.vercel.app/api/query \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "x-database-name: ${selectedDb}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": ${JSON.stringify(sqlQuery.trim())},
    "params": ${sqlParams.trim() || '[]'}
  }'`);

	let fetchSnippet = $derived(`const response = await fetch("https://your-domain.vercel.app/api/query", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${effectiveKey}",
    "x-database-name": "${selectedDb}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    sql: ${JSON.stringify(sqlQuery.trim())},
    params: ${sqlParams.trim() || '[]'}
  })
});

const { rows, rowCount } = await response.json();
console.log(rows);`);

	function copyActiveCode() {
		const text = codeTab === 'curl' ? curlSnippet : fetchSnippet;
		navigator.clipboard.writeText(text);
		copiedCode = true;
		setTimeout(() => {
			copiedCode = false;
		}, 2000);
	}

	let filteredDatabases = $derived(
		databases.filter((d) => d.name.toLowerCase().includes(searchDb.toLowerCase()))
	);
</script>

<Sidebar.Provider>
	<div class="flex min-h-screen w-full bg-slate-50/50 text-slate-900 font-sans antialiased">
		<!-- Left Panel (Sidebar) -->
		<Sidebar.Root class="w-64 border-r border-slate-100 bg-white flex flex-col shrink-0">
			<!-- Panel Brand / Title -->
			<Sidebar.Header class="p-5">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-sm font-bold tracking-tight text-slate-900">Database Gateway</h1>
						<p class="text-[11px] text-slate-400 font-medium">Management Console</p>
					</div>
					<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-mono font-medium">
						Online
					</Badge>
				</div>
			</Sidebar.Header>

			<!-- Panel Navigation -->
			<Sidebar.Content class="p-3 space-y-6 flex-1">
				<Sidebar.Group>
					<Sidebar.GroupLabel class="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
						Menu Utama
					</Sidebar.GroupLabel>
					<Sidebar.Menu class="space-y-1 mt-1.5">
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={activeTab === 'databases'}
								onclick={() => setActiveTab('databases')}
								class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'databases'
									? 'bg-slate-900 text-white font-semibold shadow-xs'
									: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
							>
								<span>Databases</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>

						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={activeTab === 'query'}
								onclick={() => setActiveTab('query')}
								class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'query'
									? 'bg-slate-900 text-white font-semibold shadow-xs'
									: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
							>
								<span>Query Console</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>

						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={activeTab === 'admins'}
								onclick={() => setActiveTab('admins')}
								class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'admins'
									? 'bg-slate-900 text-white font-semibold shadow-xs'
									: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
							>
								<span>Master Admins</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>

						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={activeTab === 'settings'}
								onclick={() => setActiveTab('settings')}
								class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'settings'
									? 'bg-slate-900 text-white font-semibold shadow-xs'
									: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
							>
								<span>API Key & Settings</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Group>
			</Sidebar.Content>

			<!-- Panel Footer (User Profile & Konfirmasi Keluar dengan Avatar & AlertDialog) -->
			<Sidebar.Footer class="p-3 bg-white">
				<div class="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100/60">
					<div class="flex items-center gap-2.5 min-w-0">
						<Avatar.Root class="w-8 h-8 rounded-full border border-slate-200 bg-white">
							<Avatar.Fallback class="bg-emerald-100 text-emerald-800 font-bold text-xs">
								{getInitials(data?.currentAdmin?.email)}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-bold text-slate-800 truncate" title={data?.currentAdmin?.email}>
								{data?.currentAdmin?.email || 'Admin'}
							</p>
							<Badge variant="outline" class="text-[9px] px-1 py-0 uppercase font-semibold text-emerald-700 bg-emerald-50/60 border-emerald-200">
								{data?.currentAdmin?.role || 'Superadmin'}
							</Badge>
						</div>
					</div>

					<Button
						variant="ghost"
						size="sm"
						onclick={() => (showLogoutConfirm = true)}
						class="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-7 px-2"
					>
						Keluar
					</Button>
				</div>
			</Sidebar.Footer>
		</Sidebar.Root>

		<!-- Main Inset Area (Full Width, Simple & Clean) -->
		<Sidebar.Inset class="flex-1 flex flex-col min-w-0 bg-slate-50/50 w-full">
			<main class="flex-1 p-5 md:p-8 space-y-6 w-full max-w-7xl mx-auto">

				<!-- ============================================== -->
				<!-- TAB 1: DATABASES                               -->
				<!-- ============================================== -->
				{#if activeTab === 'databases'}
					<!-- Judul Halaman & Action Bar -->
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h2 class="text-xl font-bold tracking-tight text-slate-900">Manajemen Database</h2>
							<p class="text-xs text-slate-400 mt-0.5">Kelola dan pantau database PostgreSQL yang berjalan pada Neon Cloud</p>
						</div>

						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={isRefreshingDbs}
								onclick={refreshDatabases}
								class="text-xs font-medium border-slate-200"
							>
								{isRefreshingDbs ? 'Memuat...' : 'Refresh'}
							</Button>

							<Button
								size="sm"
								onclick={() => (showCreateDbDialog = true)}
								class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
							>
								+ Buat Database
							</Button>
						</div>
					</div>

					<!-- Kartu Ringkasan (Shadcn Card) -->
					<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
						<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-4">
							<Card.Description class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Database</Card.Description>
							<Card.Title class="text-2xl font-bold text-slate-900 mt-1">{databases.length}</Card.Title>
						</Card.Root>

						<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-4">
							<Card.Description class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Status Neon Cloud</Card.Description>
							<div class="text-sm font-semibold text-emerald-700 mt-2 flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
								<span>Terkoneksi</span>
							</div>
						</Card.Root>

						<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-4">
							<Card.Description class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Branch Aktif</Card.Description>
							<div class="text-sm font-mono font-bold text-slate-800 mt-1.5">{data?.neonBranch || 'production'}</div>
						</Card.Root>

						<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-4">
							<Card.Description class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Master API Key</Card.Description>
							<div class="mt-1.5">
								<Badge variant={masterKey.trim() ? 'secondary' : 'outline'} class={masterKey.trim() ? 'bg-emerald-50 text-emerald-700 border-0 font-medium' : 'text-amber-700 border-amber-200'}>
									{masterKey.trim() ? 'Siap Digunakan' : 'Belum Diatur'}
								</Badge>
							</div>
						</Card.Root>
					</div>

					<!-- Micro-Chart Diagram Visualisasi Database -->
					<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-5 space-y-3">
						<div class="flex items-center justify-between">
							<div>
								<Card.Title class="text-xs font-bold uppercase tracking-wider text-slate-800">Visualisasi & Kapasitas Database</Card.Title>
								<Card.Description class="text-[11px] text-slate-400">Diagram ringkas alokasi database dan komputasi Neon PostgreSQL</Card.Description>
							</div>
							<Badge variant="outline" class="font-mono text-[10px] text-slate-500 border-slate-200">
								{databases.length} Database Terdaftar
							</Badge>
						</div>

						<!-- Simple Responsive SVG Micro-Chart -->
						<div class="space-y-2 pt-1">
							<div class="flex items-center justify-between text-xs text-slate-500">
								<span>Kapasitas Instance</span>
								<span class="font-mono font-semibold text-slate-700">Healthy (100%)</span>
							</div>
							<Progress value={databases.length > 0 ? Math.min(databases.length * 20, 100) : 10} class="h-2 bg-slate-100" />
							
							<!-- Micro Bar Distribution -->
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
								{#each databases.slice(0, 4) as db, idx}
									<div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
										<div class="flex items-center justify-between">
											<span class="font-mono text-[11px] font-bold text-slate-800 truncate" title={db.name}>{db.name}</span>
											<span class="text-[10px] font-mono text-emerald-600">{db.size || '32 kB'}</span>
										</div>
										<div class="w-full bg-slate-200/60 rounded-full h-1 overflow-hidden">
											<div class="bg-emerald-500 h-1 rounded-full transition-all duration-500" style="width: {(idx + 1) * 22}%;"></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card.Root>

					<!-- Tabel Daftar Database (Full Width dengan HoverCard) -->
					<Card.Root class="border border-slate-100 shadow-xs rounded-2xl overflow-hidden bg-white">
						<div class="p-4 border-b border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<span class="text-xs font-bold text-slate-800">Daftar Database Aktif ({filteredDatabases.length})</span>
							<Input
								type="text"
								bind:value={searchDb}
								placeholder="Cari database..."
								class="bg-slate-50/70 border-slate-200 rounded-lg text-xs w-full sm:w-56"
							/>
						</div>

						<Table.Root>
							<Table.Header class="bg-slate-50/50">
								<Table.Row>
									<Table.Head>Nama Database (Hover Detail)</Table.Head>
									<Table.Head>Ukuran</Table.Head>
									<Table.Head>Encoding</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if isRefreshingDbs}
									{#each [1, 2, 3] as _}
										<Table.Row>
											<Table.Cell><Skeleton class="h-4 w-32 rounded" /></Table.Cell>
											<Table.Cell><Skeleton class="h-4 w-16 rounded" /></Table.Cell>
											<Table.Cell><Skeleton class="h-4 w-16 rounded" /></Table.Cell>
											<Table.Cell><Skeleton class="h-4 w-14 rounded-full" /></Table.Cell>
											<Table.Cell class="text-right"><Skeleton class="h-6 w-20 rounded ml-auto" /></Table.Cell>
										</Table.Row>
									{/each}
								{:else if filteredDatabases.length === 0}
									<Table.Row>
										<Table.Cell colspan={5} class="text-center py-8 text-xs text-slate-400">
											Tidak ada database yang cocok dengan pencarian.
										</Table.Cell>
									</Table.Row>
								{:else}
									{#each filteredDatabases as db}
										<Table.Row>
											<!-- Nama Database dengan HoverCard Preview -->
											<Table.Cell>
												<HoverCard.Root>
													<HoverCard.Trigger class="font-mono text-xs font-bold text-slate-900 underline decoration-dotted decoration-slate-300 underline-offset-4 cursor-pointer hover:text-emerald-700 transition">
														{db.name}
													</HoverCard.Trigger>
													<HoverCard.Content class="w-72 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 text-xs space-y-2">
														<div>
															<p class="font-bold text-slate-900">{db.name}</p>
															<p class="text-[11px] text-slate-400">PostgreSQL Cloud Database di Neon</p>
														</div>
														<Separator class="bg-slate-100 my-1.5" />
														<div class="space-y-1 text-slate-600 text-[11px]">
															<div class="flex justify-between"><span>Encoding:</span><span class="font-mono font-bold text-slate-800">{db.encoding || 'UTF8'}</span></div>
															<div class="flex justify-between"><span>Ukuran Disk:</span><span class="font-mono font-bold text-slate-800">{db.size || '-'}</span></div>
															<div class="flex justify-between"><span>Gateway Header:</span><code class="font-mono text-emerald-700">x-database-name: {db.name}</code></div>
														</div>
													</HoverCard.Content>
												</HoverCard.Root>
											</Table.Cell>
											<Table.Cell class="text-xs font-mono text-slate-600">{db.size || '-'}</Table.Cell>
											<Table.Cell class="text-xs font-mono text-slate-500">{db.encoding || 'UTF8'}</Table.Cell>
											<Table.Cell>
												<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium">
													<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
													Online
												</Badge>
											</Table.Cell>
											<Table.Cell class="text-right">
												<Button
													variant="ghost"
													size="sm"
													onclick={() => selectDbForQuery(db.name)}
													class="text-xs font-medium text-slate-600 hover:text-slate-900"
												>
													Buka Query
												</Button>
											</Table.Cell>
										</Table.Row>
									{/each}
								{/if}
							</Table.Body>
						</Table.Root>
					</Card.Root>

					<!-- Accordion Panduan Gateway & Integrasi -->
					<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-5 space-y-3">
						<Card.Title class="text-xs font-bold uppercase tracking-wider text-slate-800">Panduan & Informasi Gateway</Card.Title>
						<Accordion.Root type="single" class="w-full">
							<Accordion.Item value="item-1">
								<Accordion.Trigger class="text-xs font-semibold text-slate-800">
									Bagaimana cara project luar mengeksekusi query melalui API Gateway?
								</Accordion.Trigger>
								<Accordion.Content class="text-xs text-slate-600 leading-relaxed space-y-1.5">
									<p>Kirim HTTP POST request ke endpoint universal <code>/api/query</code> dengan 2 header wajib:</p>
									<ul class="list-disc list-inside space-y-1 text-slate-700 font-mono text-[11px]">
										<li><code>Authorization: Bearer &lt;APP_MASTER_KEY&gt;</code></li>
										<li><code>x-database-name: &lt;nama_database&gt;</code></li>
									</ul>
									<p class="text-slate-500">Payload JSON memuat parameter <code>sql</code> dan <code>params</code> (array).</p>
								</Accordion.Content>
							</Accordion.Item>

							<Accordion.Item value="item-2">
								<Accordion.Trigger class="text-xs font-semibold text-slate-800">
									Apa aturan penamaan ketika membuat database baru?
								</Accordion.Trigger>
								<Accordion.Content class="text-xs text-slate-600 leading-relaxed">
									Nama database hanya diperbolehkan berupa huruf alfabet, angka, dan karakter underscore (<code>/^[a-zA-Z0-9_]+$/</code>). Hindari spasi atau simbol khusus agar query SQL <code>CREATE DATABASE</code> pada Neon Cloud aman dari injeksi.
								</Accordion.Content>
							</Accordion.Item>

							<Accordion.Item value="item-3">
								<Accordion.Trigger class="text-xs font-semibold text-slate-800">
									Apakah koneksi database menggunakan pooling efisien?
								</Accordion.Trigger>
								<Accordion.Content class="text-xs text-slate-600 leading-relaxed">
									Ya, gateway menggunakan dynamic pool cache berbasis driver <code>pg</code> resmi. Tiap database target di-cache dalam pool yang aman dan otomatis me-recycle koneksi idle untuk menghemat komputasi Neon.
								</Accordion.Content>
							</Accordion.Item>
						</Accordion.Root>
					</Card.Root>

				<!-- ============================================== -->
				<!-- TAB 2: QUERY CONSOLE (GATEWAY)                 -->
				<!-- ============================================== -->
				{:else if activeTab === 'query'}
					<div class="space-y-6 w-full">
						<div>
							<h2 class="text-xl font-bold tracking-tight text-slate-900">Query Console (Gateway)</h2>
							<p class="text-xs text-slate-400 mt-0.5">Jalankan SQL universal ke database tujuan melalui 1 endpoint API Gateway</p>
						</div>

						<!-- Form Eksekusi Query (Shadcn Card) -->
						<Card.Root class="border border-slate-100 rounded-2xl p-6 shadow-xs bg-white space-y-4">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-slate-700">Target Database:</span>
									<div class="w-56">
										<Combobox
											id="select-db"
											bind:value={selectedDb}
											options={databases.map((db) => ({ value: db.name, label: db.name }))}
											placeholder="Pilih Database"
											class="font-mono font-bold text-xs"
										/>
									</div>
								</div>

								{#if queryDuration}
									<Badge variant="outline" class="font-mono text-xs text-slate-600 border-slate-200">
										Durasi: <strong class="ml-1 text-slate-900">{queryDuration} ms</strong>
									</Badge>
								{/if}
							</div>

							<div class="space-y-3">
								<div>
									<label for="sql-query-input" class="block text-xs font-medium text-slate-700 mb-1.5">Perintah SQL:</label>
									<textarea
										id="sql-query-input"
										bind:value={sqlQuery}
										rows="4"
										placeholder="SELECT * FROM users WHERE status = $1"
										class="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition"
									></textarea>
								</div>

								<div>
									<label for="sql-params-input" class="block text-xs font-medium text-slate-700 mb-1.5">
										Parameter ($1, $2, ...) - Format JSON Array:
									</label>
									<Input
										id="sql-params-input"
										type="text"
										bind:value={sqlParams}
										placeholder='["active"]'
										class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
									/>
								</div>

								<div class="flex justify-end pt-1">
									<Button
										onclick={handleExecuteQuery}
										disabled={isExecuting}
										class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-5 shadow-xs"
									>
										{isExecuting ? 'Mengeksekusi...' : 'Jalankan Query'}
									</Button>
								</div>
							</div>
						</Card.Root>

						<!-- Hasil Query (Shadcn Card & ScrollArea) -->
						{#if isExecuting}
							<Card.Root class="border border-slate-100 rounded-2xl p-6 shadow-xs bg-white space-y-3">
								<Skeleton class="h-4 w-40 rounded" />
								<Skeleton class="h-32 w-full rounded-xl" />
							</Card.Root>
						{:else if queryResult}
							<Card.Root class="border border-slate-100 rounded-2xl shadow-xs overflow-hidden bg-white">
								<div class="p-4 border-b border-slate-100/70 flex items-center justify-between">
									<span class="text-xs font-bold text-slate-800">Hasil Output</span>
									{#if queryResult.rowCount !== undefined}
										<Badge variant="secondary" class="font-mono text-xs">
											{queryResult.rowCount} baris
										</Badge>
									{/if}
								</div>

								{#if queryResult.error}
									<div class="p-4">
										<Alert.Root variant="destructive" class="rounded-xl border-0 bg-rose-50/80 text-rose-800">
											<Alert.Title class="text-xs font-bold">Eksekusi Gagal</Alert.Title>
											<Alert.Description class="text-xs font-mono mt-1">{queryResult.error}</Alert.Description>
										</Alert.Root>
									</div>
								{:else if queryResult.rows && queryResult.rows.length > 0}
									<ScrollArea class="max-h-[380px] w-full">
										<Table.Root>
											<Table.Header class="bg-slate-50/50">
												<Table.Row>
													{#each Object.keys(queryResult.rows[0]) as col}
														<Table.Head class="text-xs font-mono text-slate-500">{col}</Table.Head>
													{/each}
												</Table.Row>
											</Table.Header>
											<Table.Body>
												{#each queryResult.rows as row}
													<Table.Row class="font-mono text-xs">
														{#each Object.values(row) as val}
															<Table.Cell class="text-slate-800">
																{val !== null ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : 'NULL'}
															</Table.Cell>
														{/each}
													</Table.Row>
												{/each}
											</Table.Body>
										</Table.Root>
									</ScrollArea>
								{:else}
									<div class="p-6 text-center text-xs text-slate-400 font-mono">
										Query berhasil dieksekusi tanpa baris data yang dihasilkan.
									</div>
								{/if}
							</Card.Root>
						{/if}

						<!-- Cuplikan Integrasi Kode (ToggleGroup & Code View) -->
						<Card.Root class="border border-slate-100 rounded-2xl p-6 shadow-xs bg-white space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<Card.Title class="text-xs font-bold uppercase tracking-wider text-slate-800">Integrasi Project Eksternal</Card.Title>
									<Card.Description class="text-[11px] text-slate-400">Gunakan snippet ini untuk memanggil query dari backend atau frontend Anda</Card.Description>
								</div>

								<div class="flex items-center gap-2">
									<ToggleGroup.Root type="single" value={codeTab} onValueChange={(v) => { if (v) codeTab = v; }} class="bg-slate-100 p-0.5 rounded-lg">
										<ToggleGroup.Item value="curl" class="text-xs font-mono px-2.5 py-1 rounded-md data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-2xs">
											cURL
										</ToggleGroup.Item>
										<ToggleGroup.Item value="fetch" class="text-xs font-mono px-2.5 py-1 rounded-md data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-2xs">
											Fetch (JS)
										</ToggleGroup.Item>
									</ToggleGroup.Root>

									<Button
										variant="outline"
										size="sm"
										onclick={copyActiveCode}
										class="text-xs font-medium border-slate-200"
									>
										{copiedCode ? 'Tersalin!' : 'Salin Kode'}
									</Button>
								</div>
							</div>

							<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed"><code>{codeTab === 'curl' ? curlSnippet : fetchSnippet}</code></pre>
						</Card.Root>
					</div>

				<!-- ============================================== -->
				<!-- TAB 3: MASTER ADMINS (FULL WIDTH)              -->
				<!-- ============================================== -->
				{:else if activeTab === 'admins'}
					<div class="space-y-6 w-full">
						<!-- Judul Halaman -->
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<h2 class="text-xl font-bold tracking-tight text-slate-900">Tabel Master Admin</h2>
								<p class="text-xs text-slate-400 mt-0.5">Kelola pengguna master, status aktif, hak akses role, dan tindakan akun</p>
							</div>

							<Button
								size="sm"
								onclick={() => {
									adminFeedback = { type: '', text: '' };
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

											<!-- Status Badge Murni -->
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
				<!-- TAB 4: SETTINGS & CLOUD                        -->
				<!-- ============================================== -->
				{:else if activeTab === 'settings'}
					<div class="space-y-6 w-full">
						<div>
							<h2 class="text-xl font-bold tracking-tight text-slate-900">Pengaturan Gateway & Cloud</h2>
							<p class="text-xs text-slate-400 mt-0.5">Konfigurasi Master API Key dan detail koneksi infrastruktur Neon</p>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
							<!-- Master API Key Card -->
							<Card.Root class="border border-slate-100 rounded-2xl p-6 shadow-xs bg-white space-y-4">
								<div>
									<Card.Title class="text-sm font-bold text-slate-900">Master API Key</Card.Title>
									<Card.Description class="text-xs text-slate-400">Digunakan untuk otorisasi bearer token di endpoint <code class="font-mono text-slate-700">/api/query</code></Card.Description>
								</div>

								<div class="space-y-3">
									<div>
										<div class="flex items-center justify-between mb-1.5">
											<label for="master-key-input" class="text-xs font-medium text-slate-700">Master Key:</label>
											<div class="flex items-center gap-2">
												<label for="toggle-key-visibility" class="text-[11px] text-slate-500 cursor-pointer">Lihat Key</label>
												<Switch id="toggle-key-visibility" bind:checked={showKey} />
											</div>
										</div>
										<Input
											id="master-key-input"
											type={showKey ? 'text' : 'password'}
											bind:value={masterKey}
											placeholder="Masukkan APP_MASTER_KEY..."
											class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
										/>
									</div>

									<div class="flex items-center justify-between pt-2">
										<span class="text-xs text-slate-400">Tersimpan di browser</span>
										<Button
											onclick={saveMasterKey}
											class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
										>
											{keySavedNotice ? 'Tersimpan!' : 'Simpan Key'}
										</Button>
									</div>
								</div>
							</Card.Root>

							<!-- Detail Infrastruktur Neon Cloud -->
							<Card.Root class="border border-slate-100 rounded-2xl p-6 shadow-xs bg-white space-y-4">
								<div>
									<Card.Title class="text-sm font-bold text-slate-900">Infrastruktur Neon Cloud</Card.Title>
									<Card.Description class="text-xs text-slate-400">Status koneksi branch dan driver</Card.Description>
								</div>

								<div class="space-y-3 pt-1">
									<div class="space-y-1">
										<div class="flex justify-between text-xs text-slate-500">
											<span>Koneksi Neon Cloud</span>
											<span class="font-mono font-semibold text-emerald-600">Online & Stabil</span>
										</div>
										<Progress value={100} class="h-1.5 bg-slate-100" />
									</div>

									<div class="space-y-2 text-xs">
										<div class="flex justify-between py-1.5 border-b border-slate-100/60">
											<span class="text-slate-400">Branch Aktif</span>
											<Badge variant="secondary" class="font-mono font-bold text-slate-900">{data?.neonBranch || 'production'}</Badge>
										</div>
										<div class="flex justify-between py-1.5 border-b border-slate-100/60">
											<span class="text-slate-400">Database Host</span>
											<span class="font-mono text-slate-700 truncate max-w-[200px]" title={data?.neonEndpoint}>{data?.neonEndpoint}</span>
										</div>
										<div class="flex justify-between py-1.5 border-b border-slate-100/60">
											<span class="text-slate-400">Neon Auth</span>
											<span class="font-semibold text-emerald-600">Terkoneksi</span>
										</div>
										<div class="flex justify-between py-1.5 border-b border-slate-100/60">
											<span class="text-slate-400">Neon Realtime</span>
											<span class="font-semibold text-emerald-600">Tersedia</span>
										</div>
										<div class="flex justify-between py-1.5">
											<span class="text-slate-400">Driver</span>
											<span class="font-mono font-semibold text-slate-800">pg (node-postgres)</span>
										</div>
									</div>
								</div>
							</Card.Root>
						</div>
					</div>
				{/if}
			</main>
		</Sidebar.Inset>
	</div>
</Sidebar.Provider>

<!-- ============================================== -->
<!-- DIALOG 1: TAMBAH ADMIN BARU                    -->
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
				<Input
					id="new-password"
					type="password"
					bind:value={newAdminPassword}
					required
					placeholder="Minimal 6 karakter..."
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
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
					class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
				>
					{isCreatingAdmin ? 'Menyimpan...' : 'Simpan Admin'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- DIALOG 2: EDIT ADMIN                           -->
<!-- ============================================== -->
<Dialog.Root bind:open={showEditAdminDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">Edit Data Admin</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				Perbarui email, role, atau ganti password untuk admin ini.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleUpdateAdmin} class="space-y-4 pt-2">
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
				<Input
					id="edit-password"
					type="password"
					bind:value={editPassword}
					placeholder="••••••••"
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
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
					class="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
				>
					{isUpdatingAdmin ? 'Memperbarui...' : 'Simpan Perubahan'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- ALERT DIALOG 1: KONFIRMASI HAPUS ADMIN         -->
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
				class="text-xs bg-rose-600 hover:bg-rose-700 text-white"
			>
				{isDeletingAdmin ? 'Menghapus...' : 'Ya, Hapus Admin'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- ============================================== -->
<!-- ALERT DIALOG 2: KONFIRMASI LOGOUT / KELUAR     -->
<!-- ============================================== -->
<AlertDialog.Root bind:open={showLogoutConfirm}>
	<AlertDialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<AlertDialog.Header class="space-y-1">
			<AlertDialog.Title class="text-base font-bold text-slate-900">Konfirmasi Keluar</AlertDialog.Title>
			<AlertDialog.Description class="text-xs text-slate-400">
				Apakah Anda yakin ingin mengakhiri sesi login Master Admin saat ini?
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="pt-4 flex justify-end gap-2">
			<AlertDialog.Cancel class="text-xs border-slate-200">
				Batal
			</AlertDialog.Cancel>
			<form action="/logout" method="POST">
				<AlertDialog.Action
					type="submit"
					class="text-xs bg-rose-600 hover:bg-rose-700 text-white"
				>
					Ya, Keluar
				</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- ============================================== -->
<!-- DIALOG 3: BUAT DATABASE BARU                   -->
<!-- ============================================== -->
<Dialog.Root bind:open={showCreateDbDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">Buat Database Baru</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				Database baru akan dibuat secara instan di PostgreSQL Neon Cloud.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreateDatabase} class="space-y-4 pt-2">
			<div>
				<label for="dialog-db-name" class="block text-xs font-medium text-slate-700 mb-1.5">Nama Database</label>
				<Input
					id="dialog-db-name"
					type="text"
					bind:value={newDbName}
					required
					placeholder="contoh: project_db_prod"
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
				<span class="text-[11px] text-slate-400 mt-1 block">Hanya boleh huruf, angka, dan underscore (_).</span>
			</div>

			{#if dbFeedback.text}
				<Alert.Root variant={dbFeedback.type === 'success' ? 'default' : 'destructive'} class="rounded-xl border-0 bg-slate-50">
					<Alert.Description class="text-xs">{dbFeedback.text}</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="pt-3 flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					onclick={() => (showCreateDbDialog = false)}
					class="text-xs text-slate-600 hover:text-slate-900"
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isCreatingDb}
					class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
				>
					{isCreatingDb ? 'Membuat...' : 'Buat Database'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
