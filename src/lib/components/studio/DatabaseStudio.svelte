<script>
	import { onMount } from 'svelte';
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
	import PencilIcon from '@lucide/svelte/icons/pencil';
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

	// Kredensial Database Terisolasi per Proyek (Live dari Server Neon)
	let projectRole = $state('');
	let projectPassword = $state('');
	let isChangingPassword = $state(false);
	let showChangeDbPasswordModal = $state(false);
	let generatedPasswordDisplay = $state('');
	let copiedGeneratedPassword = $state(false);

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

	// Studio Tables, Data & Indeks
	let studioTables = $state([]);
	let selectedTable = $state(null);
	let tableColumns = $state([]);
	let tableRows = $state([]);
	let tableIndexes = $state([]);
	let primaryKey = $state('id');
	let isLoadingStudio = $state(false);
	let isLoadingTableData = $state(false);

	// Row Edit & Delete Dialog states
	let showEditRowDialog = $state(false);
	let rowBeingEdited = $state(null);
	let editRowData = $state({});
	let isUpdatingRow = $state(false);

	let showDeleteRowDialog = $state(false);
	let rowBeingDeleted = $state(null);
	let isDeletingRow = $state(false);

	onMount(() => {
		const savedStudioDb = localStorage.getItem('app_studio_db');
		if (savedStudioDb && userProjects.some((d) => d.name === savedStudioDb)) {
			selectedStudioDb = savedStudioDb;
		} else if (userProjects[0]) {
			selectedStudioDb = userProjects[0].name;
		}
	});

	async function handleGenerateAutomaticPassword() {
		if (!selectedStudioDb) return;
		isChangingPassword = true;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'changePassword',
					dbName: selectedStudioDb
				})
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal mengubah password di database server.');

			projectRole = result.roleName;
			projectPassword = result.newPassword;
			generatedPasswordDisplay = result.newPassword;
			copiedGeneratedPassword = false;
			showChangeDbPasswordModal = true;
			toast.success('Password Diubah di Server', {
				description: 'Password lama seketika hangus. Project sebelumnya wajib disesuaikan.'
			});
		} catch (err) {
			toast.error('Gagal Mengubah Password', { description: err.message });
		} finally {
			isChangingPassword = false;
		}
	}

	function copyGeneratedPassword() {
		if (!generatedPasswordDisplay) return;
		navigator.clipboard.writeText(generatedPasswordDisplay);
		copiedGeneratedPassword = true;
		toast.success('Password Tersalin', { description: 'Password tersimpan di clipboard Anda.' });
		setTimeout(() => (copiedGeneratedPassword = false), 2000);
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
			if (projectRole) {
				u.username = projectRole;
			}
			if (projectPassword) {
				u.password = projectPassword;
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
				if (result.credentials) {
					projectRole = result.credentials.roleName || '';
					projectPassword = result.credentials.dbPassword || '';
				}
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
				primaryKey = result.primaryKey || 'id';
			}
		} catch (err) {
			console.error('Error loading table data:', err);
		} finally {
			if (!silent) isLoadingTableData = false;
		}
	}

	function openEditRowModal(row) {
		rowBeingEdited = row;
		const cleanData = {};
		for (const col of tableColumns) {
			const val = row[col.name];
			if (val === null || val === undefined) {
				cleanData[col.name] = '';
			} else if (typeof val === 'object') {
				cleanData[col.name] = JSON.stringify(val);
			} else {
				cleanData[col.name] = String(val);
			}
		}
		editRowData = cleanData;
		showEditRowDialog = true;
	}

	async function handleSaveRowEdit(e) {
		e.preventDefault();
		if (!selectedStudioDb || !selectedTable || !rowBeingEdited) return;

		isUpdatingRow = true;
		const pkCol = primaryKey || 'id';
		const pkVal = rowBeingEdited[pkCol];

		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'updateRow',
					dbName: selectedStudioDb,
					tableName: selectedTable,
					pkColumn: pkCol,
					pkValue: pkVal,
					rowData: editRowData
				})
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal memperbarui data baris.');

			showEditRowDialog = false;
			rowBeingEdited = null;
			toast.success('Data Berhasil Diubah', { description: 'Perubahan baris berhasil disimpan.' });
			await loadTableData(selectedStudioDb, selectedTable, false);
		} catch (err) {
			toast.error('Gagal Mengubah Data', { description: err.message });
		} finally {
			isUpdatingRow = false;
		}
	}

	function openDeleteRowModal(row) {
		rowBeingDeleted = row;
		showDeleteRowDialog = true;
	}

	async function handleConfirmDeleteRow() {
		if (!selectedStudioDb || !selectedTable || !rowBeingDeleted) return;

		isDeletingRow = true;
		const pkCol = primaryKey || 'id';
		const pkVal = rowBeingDeleted[pkCol];

		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'deleteRow',
					dbName: selectedStudioDb,
					tableName: selectedTable,
					pkColumn: pkCol,
					pkValue: pkVal
				})
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal menghapus data baris.');

			showDeleteRowDialog = false;
			rowBeingDeleted = null;
			toast.success('Data Dihapus', { description: 'Baris data berhasil dihapus dari tabel.' });
			await loadTableData(selectedStudioDb, selectedTable, false);
		} catch (err) {
			toast.error('Gagal Menghapus Data', { description: err.message });
		} finally {
			isDeletingRow = false;
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
			<!-- Top Bar: Kembali, Nama Proyek, & Tombol Segarkan -->
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
					<h2 class="text-base font-semibold text-neutral-900">{selectedStudioDb}</h2>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => {
							loadStudioTables(selectedStudioDb, false);
							toast.success('Data Disegarkan', { description: 'Menyinkronkan data terbaru dari server.' });
						}}
						class="px-2.5 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
						title="Segarkan data sekarang"
					>
						<RefreshCwIcon class="w-3.5 h-3.5 {isLoadingStudio ? 'animate-spin' : ''}" />
						<span>Segarkan</span>
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
							onclick={handleGenerateAutomaticPassword}
							disabled={isChangingPassword}
							class="text-[11px] px-2.5 py-1 border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 font-medium transition cursor-pointer flex items-center gap-1.5"
						>
							{#if isChangingPassword}
								<Spinner size="xs" />
								<span>Mengubah...</span>
							{:else}
								<span>Ubah Password</span>
							{/if}
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

			<!-- Workspace Tabel: Kiri Daftar Tabel, Kanan Isi Baris & Kolom -->
			<div class="flex flex-col md:flex-row gap-4 items-start min-h-[440px]">
				<!-- Sisi Kiri: Daftar Nama Tabel Saja -->
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

				<!-- Sisi Kanan: Isi Baris & Kolom Tabel Saja -->
				<div class="flex-1 w-full bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden">
					{#if !selectedTable}
						<div class="p-12 text-center text-xs text-neutral-400">
							Pilih tabel dari daftar di sebelah kiri untuk melihat isi baris dan kolom.
						</div>
					{:else}
						<!-- Header Tabel: Nama Tabel, Jumlah Baris, & Tombol Perbarui Data -->
						<div class="p-3.5 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-semibold text-neutral-900">{selectedTable}</h3>
								<span class="text-xs text-neutral-400 font-mono">({tableRows.length} baris)</span>
							</div>

							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => {
										loadTableData(selectedStudioDb, selectedTable, false);
										toast.success('Data Diperbarui', { description: `Data tabel "${selectedTable}" berhasil disinkronkan.` });
									}}
									class="px-2.5 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
									title="Segarkan data tabel ini sekarang"
								>
									<RefreshCwIcon class="w-3 h-3 {isLoadingTableData ? 'animate-spin' : ''}" />
									<span>Perbarui Data</span>
								</button>
							</div>
						</div>

						<!-- ISI DATA BARIS & KOLOM TABEL -->
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse text-xs">
								<thead>
									<tr class="bg-neutral-50 border-b border-neutral-200">
										{#each tableColumns as col (col.name)}
											<th class="px-3.5 py-2.5 text-xs font-medium text-neutral-600 whitespace-nowrap">
												<div class="flex items-center gap-1.5">
													<span>{col.name}</span>
													{#if col.isPrimary}
														<span class="text-[10px] font-mono text-amber-600 font-medium" title="Primary Key">#pk</span>
													{:else if col.isIndexed}
														<span class="text-[10px] font-mono text-neutral-400 font-normal" title="Ter-indeks B-Tree">#idx</span>
													{/if}
												</div>
											</th>
										{/each}
										<th class="px-3.5 py-2.5 text-xs font-medium text-neutral-600 text-right whitespace-nowrap">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody>
									{#if tableRows.length === 0}
										<tr>
											<td colspan={(tableColumns.length || 0) + 1} class="p-8 text-center text-xs text-neutral-400">
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
												<td class="px-3.5 py-2.5 text-xs whitespace-nowrap text-right">
													<div class="flex items-center justify-end gap-1">
														<button
															type="button"
															onclick={() => openEditRowModal(row)}
															class="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-md transition cursor-pointer"
															title="Ubah baris data"
														>
															<PencilIcon class="w-3.5 h-3.5" />
														</button>
														<button
															type="button"
															onclick={() => openDeleteRowModal(row)}
															class="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
															title="Hapus baris data"
														>
															<Trash2Icon class="w-3.5 h-3.5" />
														</button>
													</div>
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- ========================================== -->
<!-- MODAL: UBAH PASSWORD DATABASE OTOMATIS     -->
<!-- ========================================== -->
<Dialog.Root bind:open={showChangeDbPasswordModal}>
	<Dialog.Content class="sm:max-w-md bg-white border border-neutral-200 rounded-xl p-5 shadow-xl">
		<Dialog.Header class="pb-2 border-b border-neutral-100">
			<Dialog.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
				<ShieldCheckIcon class="w-4 h-4 text-emerald-600" />
				<span>Password Diubah di Server Neon</span>
			</Dialog.Title>
			<Dialog.Description class="text-xs text-neutral-500">
				Password baru diterapkan langsung ke database PostgreSQL Neon. Password lama seketika hangus dan tidak berlaku lagi.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 pt-3">
			<div class="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
				<div class="font-semibold flex items-center gap-1.5">
					<span>Klien Lama Wajib Disesuaikan</span>
				</div>
				<p class="text-[11px] text-amber-700 leading-relaxed">
					Project sebelumnya yang masih menggunakan password lama akan langsung gagal terhubung (ditolak server). Harap salin Connection String terbaru di bawah ini ke file <code>.env</code> project Anda.
				</p>
			</div>

			<div class="space-y-1.5">
				<label for="auto-gen-pw-input" class="text-xs font-medium text-neutral-700">Password Baru ({projectRole || selectedStudioDb})</label>
				<div class="relative flex items-center">
					<input
						id="auto-gen-pw-input"
						type="text"
						readonly
						value={generatedPasswordDisplay}
						class="w-full text-xs font-mono bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 pr-20 text-neutral-900 select-all focus:outline-none"
					/>
					<button
						type="button"
						onclick={copyGeneratedPassword}
						class="absolute right-1.5 px-2.5 py-1 text-xs bg-neutral-900 hover:bg-black text-white font-medium rounded-md transition flex items-center gap-1 cursor-pointer"
					>
						{#if copiedGeneratedPassword}
							<CheckIcon class="w-3.5 h-3.5 text-white" />
							<span>Tersalin</span>
						{:else}
							<CopyIcon class="w-3.5 h-3.5" />
							<span>Salin</span>
						{/if}
					</button>
				</div>
			</div>

			<Dialog.Footer class="pt-3 border-t border-neutral-100 flex items-center justify-between">
				<button
					type="button"
					onclick={handleGenerateAutomaticPassword}
					disabled={isChangingPassword}
					class="text-xs text-neutral-600 hover:text-black font-medium transition cursor-pointer flex items-center gap-1.5"
				>
					<RefreshCwIcon class="w-3 h-3 {isChangingPassword ? 'animate-spin' : ''}" />
					<span>Acak Ulang</span>
				</button>
				<Button
					type="button"
					size="sm"
					onclick={() => (showChangeDbPasswordModal = false)}
					class="text-xs bg-black text-white hover:bg-neutral-800 cursor-pointer"
				>
					Selesai
				</Button>
			</Dialog.Footer>
		</div>
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
					class="text-xs bg-black text-white hover:bg-neutral-800 min-w-20 flex items-center justify-center cursor-pointer"
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
				class="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-3.5 py-1.5 rounded-md transition cursor-pointer min-w-24 flex items-center justify-center"
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
<!-- MODAL: UBAH DATA BARIS (EDIT ROW)          -->
<!-- ========================================== -->
<Dialog.Root bind:open={showEditRowDialog}>
	<Dialog.Content class="sm:max-w-lg bg-white border border-neutral-200 rounded-xl p-5 shadow-xl max-h-[85vh] flex flex-col">
		<Dialog.Header class="pb-2 border-b border-neutral-100 shrink-0">
			<Dialog.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
				<PencilIcon class="w-4 h-4 text-neutral-700" />
				<span>Ubah Data Baris</span>
			</Dialog.Title>
			<Dialog.Description class="text-xs text-neutral-500">
				Tabel: <span class="font-medium text-neutral-800">{selectedTable}</span> | {primaryKey}: <span class="font-mono text-neutral-800">{rowBeingEdited?.[primaryKey]}</span>
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSaveRowEdit} class="flex flex-col flex-1 overflow-hidden pt-3">
			<div class="overflow-y-auto pr-1 space-y-3 flex-1 max-h-[50vh]">
				{#each tableColumns as col (col.name)}
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="edit-col-{col.name}" class="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
								<span>{col.name}</span>
								{#if col.isPrimary}
									<span class="text-[10px] font-mono text-amber-600 font-medium">#pk</span>
								{:else if col.isIndexed}
									<span class="text-[10px] font-mono text-neutral-400">#idx</span>
								{/if}
							</label>
							<span class="text-[10px] text-neutral-400 font-mono">{col.type}</span>
						</div>

						{#if col.isPrimary}
							<Input
								id="edit-col-{col.name}"
								type="text"
								value={editRowData[col.name]}
								disabled
								class="text-xs bg-neutral-100 text-neutral-500 font-mono border-neutral-200 cursor-not-allowed"
							/>
						{:else}
							<Input
								id="edit-col-{col.name}"
								type="text"
								bind:value={editRowData[col.name]}
								class="text-xs border-neutral-200 font-mono"
								placeholder={`Nilai untuk ${col.name}...`}
							/>
						{/if}
					</div>
				{/each}
			</div>

			<Dialog.Footer class="pt-4 border-t border-neutral-100 flex justify-end gap-2 shrink-0 mt-3">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => (showEditRowDialog = false)}
					class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50"
				>
					Batal
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={isUpdatingRow}
					class="text-xs bg-black text-white hover:bg-neutral-800 min-w-20 flex items-center justify-center cursor-pointer"
				>
					{#if isUpdatingRow}
						<Spinner size="xs" class="text-white" />
					{:else}
						Simpan
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ========================================== -->
<!-- MODAL: HAPUS BARIS DATA (DELETE ROW)       -->
<!-- ========================================== -->
<AlertDialog.Root bind:open={showDeleteRowDialog}>
	<AlertDialog.Content class="sm:max-w-sm bg-white border border-neutral-200 rounded-xl p-5 shadow-xl">
		<AlertDialog.Header class="pb-2">
			<AlertDialog.Title class="text-sm font-semibold text-neutral-900">Hapus Baris Data</AlertDialog.Title>
			<AlertDialog.Description class="text-xs text-neutral-500">
				Apakah Anda yakin ingin menghapus baris dengan {primaryKey || 'id'}: <span class="font-mono font-semibold text-neutral-900">{rowBeingDeleted?.[primaryKey || 'id']}</span> pada tabel <span class="font-semibold text-neutral-900">{selectedTable}</span>? Tindakan ini tidak dapat dibatalkan.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="pt-3 flex justify-end gap-2 border-t border-neutral-100">
			<AlertDialog.Cancel class="text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50">
				Batal
			</AlertDialog.Cancel>
			<button
				type="button"
				onclick={handleConfirmDeleteRow}
				disabled={isDeletingRow}
				class="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-3.5 py-1.5 rounded-md transition cursor-pointer min-w-20 flex items-center justify-center"
			>
				{#if isDeletingRow}
					<Spinner size="xs" class="text-white" />
				{:else}
					Hapus
				{/if}
			</button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
