<script>
	import { onMount, onDestroy } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let {
		databases = $bindable([]),
		rawDirectUrl = '',
		rawPooledUrl = '',
		masterKey = ''
	} = $props();

	// View mode state: 'list' (Daftar List Project) | 'detail' (Tabel & Isi Project)
	let viewMode = $state('list');

	// Active selected project
	let selectedStudioDb = $state('');
	let currentLoadedDb = '';

	// Filter database bawaan/sistem (postgres, neondb) agar tidak ditampilkan
	let userProjects = $derived(
		databases.filter((d) => d && d.name && !['postgres', 'neondb'].includes(d.name.toLowerCase()))
	);

	// Connection string format & scope
	let connTab = $state('env'); // 'env' | 'pooled' | 'direct' | 'prisma'
	let showConnPassword = $state(false);
	let copiedConnString = $state(false);

	// Custom DB Password state & modal
	let customDbPassword = $state('');
	let showChangeDbPasswordModal = $state(false);
	let inputCustomPassword = $state('');
	let inputCustomPasswordConfirm = $state('');
	let showInputCustomPassword = $state(false);
	let showInputCustomPasswordConfirm = $state(false);
	let dbPasswordError = $state('');

	// Project Creation Dialog
	let isRefreshingDbs = $state(false);
	let newDbName = $state('');
	let isCreatingDb = $state(false);
	let dbCreateError = $state('');
	let showCreateDbDialog = $state(false);

	// Project Deletion Dialog
	let showDeleteProjectDialog = $state(false);
	let projectToDelete = $state('');
	let isDeletingProject = $state(false);
	let deleteProjectError = $state('');

	// Studio Tables, Data & Indeks B-Tree state
	let studioTables = $state([]);
	let selectedTable = $state(null);
	let tableColumns = $state([]);
	let tableRows = $state([]);
	let tableIndexes = $state([]);
	let activeTableTab = $state('data'); // 'data' | 'indexes'
	let isLoadingStudio = $state(false);
	let isLoadingTableData = $state(false);

	// Indeks B-Tree Dialog State
	let showCreateIndexDialog = $state(false);
	let selectedIndexCol = $state('');
	let isUniqueIndex = $state(false);
	let isCreatingIndex = $state(false);

	// Live Realtime Auto-Sync State
	let isLiveSync = $state(true);
	let isSyncingInBackground = false;
	let lastSyncedAt = $state('');
	let liveSyncTimer = null;

	onMount(() => {
		const savedCustomPw = localStorage.getItem('neon_custom_db_password');
		if (savedCustomPw) {
			customDbPassword = savedCustomPw;
		}

		const savedStudioDb = localStorage.getItem('app_studio_db');
		if (savedStudioDb && userProjects.some((d) => d.name === savedStudioDb)) {
			selectedStudioDb = savedStudioDb;
		} else if (userProjects[0]) {
			selectedStudioDb = userProjects[0].name;
		}

		startLiveSyncInterval();
	});

	onDestroy(() => {
		stopLiveSyncInterval();
	});

	function startLiveSyncInterval() {
		stopLiveSyncInterval();
		liveSyncTimer = setInterval(() => {
			if (!isLiveSync) return;
			if (typeof document !== 'undefined' && document.hidden) return; // hemat kuota Vercel & Neon saat tab diminimalkan
			if (viewMode === 'detail' && selectedStudioDb && !isSyncingInBackground) {
				performSilentSync();
			}
		}, 3500);
	}

	function stopLiveSyncInterval() {
		if (liveSyncTimer) {
			clearInterval(liveSyncTimer);
			liveSyncTimer = null;
		}
	}

	async function performSilentSync() {
		if (isSyncingInBackground || !selectedStudioDb) return;
		isSyncingInBackground = true;
		try {
			await loadStudioTables(selectedStudioDb, true);
			if (selectedTable) {
				await loadTableData(selectedStudioDb, selectedTable, true);
			}
		} catch (err) {
			console.error('Silent sync error:', err);
		} finally {
			isSyncingInBackground = false;
		}
	}

	$effect(() => {
		if (userProjects.length > 0 && (!selectedStudioDb || !userProjects.some((d) => d.name === selectedStudioDb))) {
			selectedStudioDb = userProjects[0].name;
		}
	});

	$effect(() => {
		if (selectedStudioDb && selectedStudioDb !== currentLoadedDb && viewMode === 'detail') {
			currentLoadedDb = selectedStudioDb;
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('app_studio_db', selectedStudioDb);
			}
			loadStudioTables(selectedStudioDb);
		}
	});

	// Connection String Generator
	function getDbConnectionString(dbName, mode = 'pooled', masked = false) {
		const rawDirect = rawDirectUrl || '';
		const rawPooled = rawPooledUrl || rawDirect;

		let baseStr = mode === 'direct' ? rawDirect : rawPooled;
		if (!baseStr) baseStr = rawDirect || rawPooled || '';
		if (!baseStr) return '';

		try {
			const u = new URL(baseStr);
			if (dbName) {
				u.pathname = `/${dbName}`;
			}
			if (customDbPassword.trim()) {
				u.password = customDbPassword.trim();
			}
			let connStr = u.toString();
			if (masked) {
				connStr = connStr.replace(/(:)([^@/]+)(@)/, '$1••••••••••••$3');
			}
			return connStr;
		} catch {
			return baseStr;
		}
	}

	function buildFormattedString(dbName, mode, masked) {
		const str = getDbConnectionString(dbName, mode, masked);
		if (connTab === 'env') {
			return `DATABASE_URL="${str}"`;
		}
		if (connTab === 'prisma') {
			return `// schema.prisma\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL") // ${str}\n}`;
		}
		return str;
	}

	// Active string inside detail view
	let activeDetailConnString = $derived.by(() => {
		const mode = connTab === 'direct' ? 'direct' : 'pooled';
		return buildFormattedString(selectedStudioDb, mode, !showConnPassword);
	});

	function copyDetailConnectionString() {
		navigator.clipboard.writeText(buildFormattedString(selectedStudioDb, connTab === 'direct' ? 'direct' : 'pooled', false));
		copiedConnString = true;
		setTimeout(() => {
			copiedConnString = false;
		}, 2000);
	}

	function openProjectDetail(projectName) {
		selectedStudioDb = projectName;
		viewMode = 'detail';
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('app_studio_db', projectName);
		}
		loadStudioTables(projectName);
	}

	function backToProjectsList() {
		viewMode = 'list';
	}

	function openChangeDbPasswordModal() {
		inputCustomPassword = '';
		inputCustomPasswordConfirm = '';
		showInputCustomPassword = false;
		showInputCustomPasswordConfirm = false;
		dbPasswordError = '';
		showChangeDbPasswordModal = true;
	}

	function handleSaveCustomPassword(e) {
		e.preventDefault();
		dbPasswordError = '';

		if (!inputCustomPassword.trim()) {
			toast.error('Password Kosong', { description: 'Password baru tidak boleh kosong.' });
			return;
		}

		if (inputCustomPassword !== inputCustomPasswordConfirm) {
			toast.error('Password Tidak Cocok', { description: 'Konfirmasi password tidak sesuai.' });
			return;
		}

		customDbPassword = inputCustomPassword.trim();
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('neon_custom_db_password', customDbPassword);
		}
		toast.success('Password Disimpan', { description: 'Password database lokal berhasil diperbarui.' });
		showChangeDbPasswordModal = false;
	}

	async function refreshDatabasesList() {
		isRefreshingDbs = true;
		try {
			const res = await fetch('/api/databases', {
				headers: masterKey.trim() ? { Authorization: `Bearer ${masterKey.trim()}` } : {}
			});
			const result = await res.json();
			if (res.ok && result.databases) {
				databases = result.databases;
			}
		} catch (err) {
			console.error('Failed refreshing databases:', err);
		} finally {
			isRefreshingDbs = false;
		}
	}

	async function loadStudioTables(dbName, silent = false) {
		if (!dbName) return;
		if (!silent) isLoadingStudio = true;
		try {
			const res = await fetch(`/api/studio?db=${encodeURIComponent(dbName)}`, {
				headers: masterKey.trim() ? { Authorization: `Bearer ${masterKey.trim()}` } : {}
			});
			const result = await res.json();
			if (res.ok && result.tables) {
				studioTables = result.tables;
				if (studioTables.length > 0) {
					const stillExists = selectedTable && studioTables.some((t) => t.name === selectedTable);
					const tableToLoad = stillExists ? selectedTable : studioTables[0].name;
					selectedTable = tableToLoad;
					await loadTableData(dbName, tableToLoad, silent);
				} else {
					selectedTable = null;
					tableColumns = [];
					tableRows = [];
				}
				lastSyncedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
			}
		} catch (err) {
			console.error('Error loading tables:', err);
		} finally {
			if (!silent) isLoadingStudio = false;
		}
	}

	async function loadTableData(dbName, tableName, silent = false) {
		if (!dbName || !tableName) return;
		if (!silent) isLoadingTableData = true;
		try {
			const res = await fetch(`/api/studio?db=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`, {
				headers: masterKey.trim() ? { Authorization: `Bearer ${masterKey.trim()}` } : {}
			});
			const result = await res.json();
			if (res.ok) {
				tableColumns = result.columns || [];
				tableRows = result.rows || [];
				tableIndexes = result.indexes || [];
				lastSyncedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
			}
		} catch (err) {
			console.error('Error loading table data:', err);
		} finally {
			if (!silent) isLoadingTableData = false;
		}
	}

	function openCreateIndexDialog() {
		if (tableColumns.length > 0) {
			selectedIndexCol = tableColumns[0].name;
		}
		isUniqueIndex = false;
		showCreateIndexDialog = true;
	}

	async function handleCreateIndex(e) {
		e.preventDefault();
		if (!selectedStudioDb || !selectedTable || !selectedIndexCol) return;

		isCreatingIndex = true;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'createIndex',
					dbName: selectedStudioDb,
					tableName: selectedTable,
					columnName: selectedIndexCol,
					isUnique: isUniqueIndex
				})
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal membuat indeks.');

			showCreateIndexDialog = false;
			toast.success('Indeks B-Tree Dibuat', { description: `Indeks pada kolom "${selectedIndexCol}" aktif.` });
			await loadTableData(selectedStudioDb, selectedTable, false);
		} catch (err) {
			toast.error('Gagal Membuat Indeks', { description: err.message });
		} finally {
			isCreatingIndex = false;
		}
	}

	async function handleDropIndex(indexName) {
		if (!selectedStudioDb || !indexName) return;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'dropIndex',
					dbName: selectedStudioDb,
					indexName
				})
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal menghapus indeks.');

			toast.success('Indeks Dihapus', { description: `Indeks "${indexName}" berhasil dihapus.` });
			await loadTableData(selectedStudioDb, selectedTable, false);
		} catch (err) {
			toast.error('Gagal Menghapus Indeks', { description: err.message });
		}
	}

	async function handleCreateProject(e) {
		e.preventDefault();
		dbCreateError = '';

		const cleanName = newDbName.trim();
		if (!cleanName || !/^[a-zA-Z0-9_]+$/.test(cleanName)) {
			toast.error('Nama Tidak Valid', { description: 'Hanya boleh huruf, angka, atau underscore.' });
			return;
		}

		isCreatingDb = true;
		try {
			const res = await fetch('/api/databases', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({ dbName: cleanName })
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result.error || 'Gagal membuat proyek.');
			}

			if (!databases.some((d) => d.name === cleanName)) {
				databases = [...databases, { name: cleanName, size: '0 kB', encoding: 'UTF8' }];
			}

			newDbName = '';
			showCreateDbDialog = false;
			toast.success('Proyek Dibuat', { description: `Proyek "${cleanName}" berhasil ditambahkan.` });
			openProjectDetail(cleanName);
		} catch (err) {
			toast.error('Gagal Membuat Proyek', { description: err.message });
		} finally {
			isCreatingDb = false;
		}
	}

	function openDeleteProjectDialog(projectName) {
		projectToDelete = projectName;
		deleteProjectError = '';
		showDeleteProjectDialog = true;
	}

	async function handleDeleteProject() {
		if (!projectToDelete) return;
		isDeletingProject = true;
		deleteProjectError = '';
		try {
			const deletedName = projectToDelete;
			const res = await fetch('/api/databases', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({ dbName: projectToDelete })
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result.error || 'Gagal menghapus proyek.');
			}

			databases = databases.filter((d) => d.name !== projectToDelete);
			if (selectedStudioDb === projectToDelete) {
				selectedStudioDb = userProjects[0]?.name || '';
			}
			showDeleteProjectDialog = false;
			projectToDelete = '';
			toast.success('Proyek Dihapus', { description: `Proyek "${deletedName}" berhasil dihapus.` });
		} catch (err) {
			toast.error('Gagal Menghapus', { description: err.message });
		} finally {
			isDeletingProject = false;
		}
	}

	function handleSelectTable(tblName) {
		selectedTable = tblName;
		loadTableData(selectedStudioDb, tblName);
	}

	function formatCellValue(val) {
		if (val === null || val === undefined) return 'null';
		if (typeof val === 'object') return JSON.stringify(val);
		return String(val);
	}
</script>

<div class="space-y-6">
	<!-- ========================================== -->
	<!-- VIEW 1: DAFTAR LIST PROJECT                -->
	<!-- ========================================== -->
	{#if viewMode === 'list'}
		<div class="space-y-6">
			<!-- Header List: Simple & Clean -->
			<div class="flex items-center justify-between pb-4 border-b border-neutral-200">
				<h1 class="text-xl font-bold tracking-tight text-neutral-900">Proyek</h1>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={refreshDatabasesList}
						class="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
						title="Segarkan"
					>
						<RefreshCwIcon class="w-4 h-4 {isRefreshingDbs ? 'animate-spin' : ''}" />
					</button>
					<button
						type="button"
						onclick={() => (showCreateDbDialog = true)}
						class="px-3.5 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition cursor-pointer"
					>
						+ Tambah Proyek
					</button>
				</div>
			</div>

			<!-- Grid List Project: Hanya Nama, Ukuran, dan Tombol Buka Tabel -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#if userProjects.length === 0}
					<div class="col-span-full py-12 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
						<p class="text-xs text-neutral-500 font-medium">Belum ada proyek yang dibuat.</p>
						<p class="text-[11px] text-neutral-400 mt-1">Klik tombol "+ Tambah Proyek" di atas untuk membuat proyek pertama Anda.</p>
					</div>
				{:else}
					{#each userProjects as db (db.name)}
						<div class="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-400 transition">
							<div>
								<h3 class="text-base font-semibold text-neutral-900">{db.name}</h3>
								<p class="text-xs text-neutral-400 mt-1">{db.size || '0 kB'}</p>
							</div>
							<div class="pt-5 mt-auto flex items-center gap-2">
								<button
									type="button"
									onclick={() => openProjectDetail(db.name)}
									class="flex-1 py-2 px-3 bg-black hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition cursor-pointer text-center"
								>
									Buka Tabel
								</button>
								<button
									type="button"
									onclick={() => openDeleteProjectDialog(db.name)}
									class="py-2 px-3 border border-neutral-200 hover:border-rose-300 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 text-xs font-medium rounded-lg transition cursor-pointer"
									title="Hapus Proyek"
								>
									Hapus
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

	<!-- ========================================== -->
	<!-- VIEW 2: DETAIL PROJECT & TABEL (READ-ONLY) -->
	<!-- ========================================== -->
	{:else}
		<div class="space-y-6">
			<!-- Top Bar: Ikon + Kembali, project name, Live Sync Toggle & Refresh instan -->
			<div class="flex items-center justify-between pb-4 border-b border-neutral-200 flex-wrap gap-2">
				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={backToProjectsList}
						class="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black font-medium transition cursor-pointer"
					>
						<ArrowLeftIcon class="w-4 h-4" />
						<span>Kembali</span>
					</button>
					<span class="text-neutral-300">|</span>
					<div class="flex items-center gap-2">
						<h2 class="text-base font-semibold text-neutral-900">{selectedStudioDb}</h2>
						{#if isLiveSync}
							<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
								Live Realtime
							</span>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-2">
					<!-- Tombol Toggle Live Sync Otomatis -->
					<button
						type="button"
						onclick={() => {
							isLiveSync = !isLiveSync;
							if (isLiveSync) {
								startLiveSyncInterval();
								toast.info('Live Sync Aktif', { description: 'Data diperbarui otomatis tiap 3.5 detik.' });
							} else {
								stopLiveSyncInterval();
								toast.info('Live Sync Dimatikan', { description: 'Mode pembaruan data manual.' });
							}
						}}
						class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer {isLiveSync
							? 'bg-neutral-900 text-white border-neutral-900'
							: 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}"
						title={isLiveSync ? 'Klik untuk mematikan auto-sync' : 'Klik untuk mengaktifkan auto-sync tiap 3.5s'}
					>
						<span class="w-2 h-2 rounded-full {isLiveSync ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-400'}"></span>
						<span>{isLiveSync ? 'Auto-Sync: ON' : 'Auto-Sync: OFF'}</span>
					</button>

					{#if lastSyncedAt}
						<span class="text-[10px] text-neutral-400 font-mono hidden sm:inline" title="Waktu sinkronisasi terakhir">
							{lastSyncedAt}
						</span>
					{/if}

					<button
						type="button"
						onclick={() => {
							loadStudioTables(selectedStudioDb, false);
							toast.success('Data Disegarkan', { description: 'Menyinkronkan data terbaru dari server.' });
						}}
						class="px-2.5 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
						title="Segarkan data sekarang (1 klik)"
					>
						<RefreshCwIcon class="w-3.5 h-3.5 {isLoadingStudio ? 'animate-spin' : ''}" />
						<span class="hidden sm:inline">Segarkan</span>
					</button>
				</div>
			</div>

			<!-- Connection String Card: Rapi, Modern, Tab Bersih, Ikon Salin pada Key -->
			<div class="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
				<div class="flex items-center justify-between flex-wrap gap-2">
					<span class="text-xs font-semibold text-neutral-900 tracking-tight">Connection String</span>
					<div class="flex items-center gap-2">
						<div class="flex items-center bg-neutral-100 p-0.5 rounded-lg text-[11px]">
							{#each [
								{ id: 'env', label: '.env' },
								{ id: 'pooled', label: 'Pooled' },
								{ id: 'direct', label: 'Direct' },
								{ id: 'prisma', label: 'Prisma' }
							] as tab}
								<button
									type="button"
									onclick={() => (connTab = tab.id)}
									class="px-2.5 py-1 rounded-md font-medium transition cursor-pointer {connTab === tab.id
										? 'bg-black text-white shadow-xs'
										: 'text-neutral-600 hover:text-black'}"
								>
									{tab.label}
								</button>
							{/each}
						</div>
						<button
							type="button"
							onclick={openChangeDbPasswordModal}
							class="text-[11px] px-2.5 py-1 border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium transition cursor-pointer"
						>
							Ubah Password
						</button>
					</div>
				</div>

				<!-- String Box with Copy Icon on Key -->
				<div class="bg-neutral-950 text-neutral-200 rounded-lg p-3 font-mono text-xs flex items-center justify-between gap-3 border border-neutral-900">
					<div class="overflow-x-auto whitespace-pre font-mono text-[11px] text-neutral-300 flex-1 pr-2">
						{activeDetailConnString}
					</div>
					<div class="flex items-center gap-1 shrink-0">
						<button
							type="button"
							onclick={() => (showConnPassword = !showConnPassword)}
							class="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
							title={showConnPassword ? 'Sembunyikan Password' : 'Lihat Password'}
						>
							{#if showConnPassword}
								<EyeOffIcon class="w-3.5 h-3.5" />
							{:else}
								<EyeIcon class="w-3.5 h-3.5" />
							{/if}
						</button>
						<button
							type="button"
							onclick={copyDetailConnectionString}
							class="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
							title="Salin Connection String"
						>
							{#if copiedConnString}
								<CheckIcon class="w-3.5 h-3.5 text-white" />
							{:else}
								<CopyIcon class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Workspace Tabel (Read-Only Viewer): Kiri Daftar Tabel, Kanan Isi Baris & Kolom -->
			<div class="flex flex-col md:flex-row gap-4 items-start min-h-[440px]">
				<!-- Sisi Kiri: Daftar Nama Tabel Saja (Read-Only) -->
				<div class="w-full md:w-56 shrink-0 bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden">
					<div class="p-3 border-b border-neutral-100 flex items-center justify-between">
						<span class="text-xs font-semibold text-neutral-900">Tabel</span>
						<span class="text-[11px] text-neutral-400">{studioTables.length}</span>
					</div>

					<div class="p-2 space-y-0.5 overflow-y-auto max-h-[500px]">
						{#if studioTables.length === 0}
							<p class="text-xs text-neutral-400 p-4 text-center">Belum ada tabel</p>
						{:else}
							{#each studioTables as tbl (tbl.name)}
								<button
									type="button"
									onclick={() => handleSelectTable(tbl.name)}
									class="w-full text-left px-3 py-2 rounded-lg text-xs truncate transition cursor-pointer {selectedTable === tbl.name ? 'bg-neutral-100 text-neutral-900 font-semibold' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}"
								>
									{tbl.name}
								</button>
							{/each}
						{/if}
					</div>
				</div>

				<!-- Sisi Kanan: Isi Baris & Kolom Tabel Saja (Read-Only) -->
				<div class="flex-1 w-full bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden">
					{#if !selectedTable}
						<div class="p-12 text-center text-xs text-neutral-400">
							Pilih tabel dari daftar di sebelah kiri untuk melihat isi baris dan kolom.
						</div>
					{:else}
						<!-- Header Tabel: Nama Tabel, Tab Data / Indeks, & Aksi -->
						<div class="p-3.5 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
							<div class="flex items-center gap-3">
								<h3 class="text-sm font-semibold text-neutral-900">{selectedTable}</h3>

								<!-- Tab Switcher: Data vs Indeks B-Tree -->
								<div class="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs">
									<button
										type="button"
										onclick={() => (activeTableTab = 'data')}
										class="px-2.5 py-1 rounded-md font-medium transition cursor-pointer {activeTableTab === 'data'
											? 'bg-white text-neutral-900 shadow-xs'
											: 'text-neutral-500 hover:text-neutral-900'}"
									>
										Data ({tableRows.length})
									</button>
									<button
										type="button"
										onclick={() => (activeTableTab = 'indexes')}
										class="px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 {activeTableTab === 'indexes'
											? 'bg-white text-neutral-900 shadow-xs'
											: 'text-neutral-500 hover:text-neutral-900'}"
									>
										<ZapIcon class="w-3 h-3 {tableIndexes.length > 0 ? 'text-amber-500' : 'text-neutral-400'}" />
										<span>Indeks ({tableIndexes.length})</span>
									</button>
								</div>

								{#if isLiveSync && activeTableTab === 'data'}
									<span class="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
										Live
									</span>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								{#if activeTableTab === 'indexes'}
									<button
										type="button"
										onclick={openCreateIndexDialog}
										class="px-3 py-1 bg-black hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
									>
										<ZapIcon class="w-3 h-3 text-amber-400" />
										<span>+ Buat Indeks</span>
									</button>
								{:else}
									<button
										type="button"
										onclick={() => {
											loadTableData(selectedStudioDb, selectedTable, false);
											toast.success('Tabel Disegarkan', { description: `Data tabel "${selectedTable}" diperbarui.` });
										}}
										class="px-2.5 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
										title="Segarkan data tabel ini sekarang"
									>
										<RefreshCwIcon class="w-3 h-3 {isLoadingTableData ? 'animate-spin' : ''}" />
										<span>Perbarui Data</span>
									</button>
								{/if}
							</div>
						</div>

						<!-- KONTEN TAB 1: ISI DATA BARIS & KOLOM -->
						{#if activeTableTab === 'data'}
							<div class="overflow-x-auto">
								<table class="w-full text-left border-collapse text-xs">
									<thead>
										<tr class="bg-neutral-50 border-b border-neutral-200">
											{#each tableColumns as col (col.name)}
												<th class="px-3.5 py-2.5 text-xs font-medium text-neutral-600 whitespace-nowrap">
													<div class="flex items-center gap-1.5">
														<span>{col.name}</span>
														{#if col.isPrimary}
															<span class="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Primary Key">PK</span>
														{:else if col.isIndexed}
															<span class="text-[9px] font-mono font-semibold px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="Ter-indeks B-Tree (Pencarian Cepat)">IDX</span>
														{/if}
													</div>
												</th>
											{/each}
										</tr>
									</thead>
									<tbody>
										{#if tableRows.length === 0}
											<tr>
												<td colspan={tableColumns.length || 1} class="p-8 text-center text-xs text-neutral-400">
													Tabel ini belum memiliki data baris.
												</td>
											</tr>
										{:else}
											{#each tableRows as row, idx (idx)}
												<tr class="border-b border-neutral-100 hover:bg-neutral-50/60 transition">
													{#each tableColumns as col (col.name)}
														<td class="px-3.5 py-2.5 text-xs font-mono text-neutral-800 whitespace-nowrap max-w-xs truncate">
															{#if row[col.name] === null || row[col.name] === undefined}
																<span class="text-neutral-300 italic">null</span>
															{:else}
																{formatCellValue(row[col.name])}
															{/if}
														</td>
													{/each}
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
							</div>

						<!-- KONTEN TAB 2: DAFTAR INDEKS B-TREE PADA TABEL -->
						{:else}
							<div class="p-4 space-y-4">
								<div class="flex items-center justify-between text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
									<div class="flex items-center gap-2">
										<ZapIcon class="w-4 h-4 text-amber-500 shrink-0" />
										<span>Indeks B-Tree mengeliminasi Full Table Scan (pencarian lambat per baris) menjadi <strong>Index Scan instan O(log N)</strong>.</span>
									</div>
								</div>

								{#if tableIndexes.length === 0}
									<div class="p-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
										Belum ada indeks khusus pada tabel ini. Klik tombol <strong>+ Buat Indeks</strong> di atas untuk mempercepat query kolom.
									</div>
								{:else}
									<div class="overflow-x-auto border border-neutral-200 rounded-xl">
										<table class="w-full text-left border-collapse text-xs">
											<thead>
												<tr class="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-medium">
													<th class="p-3">Nama Indeks</th>
													<th class="p-3">Kolom Target</th>
													<th class="p-3">Metode</th>
													<th class="p-3">Tipe / Karakteristik</th>
													<th class="p-3 text-right">Aksi</th>
												</tr>
											</thead>
											<tbody>
												{#each tableIndexes as idx (idx.name)}
													<tr class="border-b border-neutral-100 hover:bg-neutral-50/60 transition font-mono">
														<td class="p-3 font-semibold text-neutral-900">{idx.name}</td>
														<td class="p-3 text-emerald-700 font-semibold">{idx.column}</td>
														<td class="p-3 uppercase text-[11px] text-neutral-500">{idx.type || 'btree'}</td>
														<td class="p-3">
															{#if idx.isPrimary}
																<span class="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-amber-50 text-amber-800 border border-amber-200">
																	Primary Key
																</span>
															{:else if idx.isUnique}
																<span class="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-purple-50 text-purple-700 border border-purple-200">
																	Unique Index
																</span>
															{:else}
																<span class="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
																	B-Tree Index
																</span>
															{/if}
														</td>
														<td class="p-3 text-right font-sans">
															{#if !idx.isPrimary}
																<button
																	type="button"
																	onclick={() => handleDropIndex(idx.name)}
																	class="p-1.5 text-neutral-400 hover:text-rose-600 rounded transition cursor-pointer"
																	title="Hapus indeks ini"
																>
																	<Trash2Icon class="w-3.5 h-3.5" />
																</button>
															{:else}
																<span class="text-[11px] text-neutral-400 italic">Terkunci (PK)</span>
															{/if}
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- ========================================== -->
<!-- MODAL: UBAH PASSWORD DATABASE              -->
<!-- ========================================== -->
<Dialog.Root bind:open={showChangeDbPasswordModal}>
	<Dialog.Content class="sm:max-w-sm bg-white border border-neutral-200 rounded-xl p-5 shadow-xl">
		<Dialog.Header class="pb-2 border-b border-neutral-100">
			<Dialog.Title class="text-sm font-semibold text-neutral-900">Ubah Password Database</Dialog.Title>
		</Dialog.Header>

		{#if dbPasswordError}
			<div class="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 my-2">
				{dbPasswordError}
			</div>
		{/if}

		<form onsubmit={handleSaveCustomPassword} class="space-y-3 pt-2">
			<div>
				<label for="db-new-pw" class="text-xs text-neutral-600 block mb-1">Password Baru</label>
				<div class="relative">
					<Input
						id="db-new-pw"
						type={showInputCustomPassword ? 'text' : 'password'}
						placeholder="Password baru..."
						bind:value={inputCustomPassword}
						required
						class="text-xs border-neutral-200 pr-9"
					/>
					<button
						type="button"
						onclick={() => (showInputCustomPassword = !showInputCustomPassword)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
						title={showInputCustomPassword ? 'Sembunyikan password' : 'Lihat password'}
						aria-label={showInputCustomPassword ? 'Sembunyikan password' : 'Lihat password'}
					>
						{#if showInputCustomPassword}
							<EyeOffIcon class="w-4 h-4" />
						{:else}
							<EyeIcon class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>
			<div>
				<label for="db-confirm-pw" class="text-xs text-neutral-600 block mb-1">Konfirmasi Password Baru</label>
				<div class="relative">
					<Input
						id="db-confirm-pw"
						type={showInputCustomPasswordConfirm ? 'text' : 'password'}
						placeholder="Ulangi password baru..."
						bind:value={inputCustomPasswordConfirm}
						required
						class="text-xs border-neutral-200 pr-9"
					/>
					<button
						type="button"
						onclick={() => (showInputCustomPasswordConfirm = !showInputCustomPasswordConfirm)}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition focus:outline-none cursor-pointer p-0.5 rounded"
						title={showInputCustomPasswordConfirm ? 'Sembunyikan password' : 'Lihat password'}
						aria-label={showInputCustomPasswordConfirm ? 'Sembunyikan password' : 'Lihat password'}
					>
						{#if showInputCustomPasswordConfirm}
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
					onclick={() => (showChangeDbPasswordModal = false)}
					class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50"
				>
					Batal
				</Button>
				<Button
					type="submit"
					size="sm"
					class="text-xs bg-black text-white hover:bg-neutral-800"
				>
					Simpan
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ========================================== -->
<!-- MODAL: TAMBAH PROYEK BARU                 -->
<!-- ========================================== -->
<Dialog.Root bind:open={showCreateDbDialog}>
	<Dialog.Content class="sm:max-w-sm bg-white border border-neutral-200 rounded-xl p-5 shadow-xl">
		<Dialog.Header class="pb-2 border-b border-neutral-100">
			<Dialog.Title class="text-sm font-semibold text-neutral-900">Tambah Proyek Baru</Dialog.Title>
		</Dialog.Header>

		{#if dbCreateError}
			<div class="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 my-2">
				{dbCreateError}
			</div>
		{/if}

		<form onsubmit={handleCreateProject} class="space-y-3 pt-2">
			<div>
				<label for="new-project-name" class="text-xs text-neutral-600 block mb-1">Nama Proyek</label>
				<Input
					id="new-project-name"
					type="text"
					placeholder="contoh: blog_app, inventory..."
					bind:value={newDbName}
					required
					class="text-xs border-neutral-200"
				/>
			</div>

			<Dialog.Footer class="pt-3 flex justify-end gap-2 border-t border-neutral-100">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => (showCreateDbDialog = false)}
					class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50"
				>
					Batal
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={isCreatingDb || !newDbName.trim()}
					class="text-xs bg-black text-white hover:bg-neutral-800 min-w-20 flex items-center justify-center"
				>
					{#if isCreatingDb}
						<Spinner size="xs" class="text-white" />
					{:else}
						Buat Proyek
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ========================================== -->
<!-- MODAL: HAPUS PROYEK (ALERT DIALOG)        -->
<!-- ========================================== -->
<AlertDialog.Root bind:open={showDeleteProjectDialog}>
	<AlertDialog.Content class="sm:max-w-sm bg-white border border-neutral-200 rounded-xl p-5 shadow-xl">
		<AlertDialog.Header class="pb-2">
			<AlertDialog.Title class="text-sm font-semibold text-neutral-900">Hapus Proyek</AlertDialog.Title>
			<AlertDialog.Description class="text-xs text-neutral-500">
				Apakah Anda yakin ingin menghapus proyek <span class="font-semibold text-neutral-900">"{projectToDelete}"</span>? Seluruh database dan tabel di dalamnya akan dihapus secara permanen.
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if deleteProjectError}
			<div class="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 my-2">
				{deleteProjectError}
			</div>
		{/if}

		<AlertDialog.Footer class="pt-3 flex justify-end gap-2 border-t border-neutral-100">
			<AlertDialog.Cancel class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50">
				Batal
			</AlertDialog.Cancel>
			<button
				type="button"
				onclick={handleDeleteProject}
				disabled={isDeletingProject}
				class="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-md transition cursor-pointer min-w-24 flex items-center justify-center"
			>
				{#if isDeletingProject}
					<Spinner size="xs" class="text-white" />
				{:else}
					Hapus Proyek
				{/if}
			</button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- ========================================== -->
<!-- MODAL: BUAT INDEKS B-TREE BARU             -->
<!-- ========================================== -->
<Dialog.Root bind:open={showCreateIndexDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-neutral-200 rounded-xl p-5 shadow-xl">
		<Dialog.Header class="pb-2 border-b border-neutral-100">
			<Dialog.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
				<ZapIcon class="w-4 h-4 text-amber-500" />
				<span>Buat Indeks B-Tree Cepat</span>
			</Dialog.Title>
			<Dialog.Description class="text-xs text-neutral-500">
				Terapkan indeks B-Tree pada kolom tabel <span class="font-semibold text-neutral-800">"{selectedTable}"</span> untuk mengeliminasi Sequential Scan dan melesatkan performa query.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreateIndex} class="space-y-4 pt-3">
			<div class="space-y-1.5">
				<label for="index-target-col" class="text-xs font-medium text-neutral-700">Pilih Kolom Target</label>
				<select
					id="index-target-col"
					bind:value={selectedIndexCol}
					required
					class="w-full text-xs font-mono border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
				>
					{#each tableColumns as col}
						<option value={col.name}>
							{col.name} ({col.type}) {col.isPrimary ? '- [Primary Key]' : col.isIndexed ? '- [Sudah Ada Indeks]' : ''}
						</option>
					{/each}
				</select>
			</div>

			<div class="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
				<input
					type="checkbox"
					id="is-unique-idx"
					bind:checked={isUniqueIndex}
					class="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
				/>
				<label for="is-unique-idx" class="text-xs text-neutral-700 cursor-pointer">
					<span class="font-semibold block">Unique Index (Nilai Unik)</span>
					<span class="text-neutral-500 text-[11px] block">Mencegah data duplikat pada kolom ini sekaligus meng-index pencarian.</span>
				</label>
			</div>

			<Dialog.Footer class="pt-3 border-t border-neutral-100 flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => (showCreateIndexDialog = false)}
					class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50"
				>
					Batal
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={isCreatingIndex || !selectedIndexCol}
					class="text-xs bg-black text-white hover:bg-neutral-800 min-w-28 flex items-center justify-center cursor-pointer"
				>
					{#if isCreatingIndex}
						<Spinner size="xs" class="text-white" />
					{:else}
						<span>Terapkan Indeks</span>
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
