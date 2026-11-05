<script>
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import TableIcon from '@lucide/svelte/icons/table';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import CodeIcon from '@lucide/svelte/icons/code';
	import KeyIcon from '@lucide/svelte/icons/key';
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

	// Databases & Studio state
	let databases = $state([]);
	let selectedStudioDb = $state('neondb');
	let currentLoadedDb = '';
	let connTab = $state('env'); // 'env' | 'pooled' | 'direct' | 'prisma'
	let showConnPassword = $state(false);
	let copiedConnString = $state(false);
	let isRefreshingDbs = $state(false);
	let newDbName = $state('');
	let isCreatingDb = $state(false);
	let dbFeedback = $state({ type: '', text: '' });
	let showCreateDbDialog = $state(false);
	let createdDbSuccess = $state(null);

	// Studio Tables & Data state
	let studioTables = $state([]);
	let searchStudioTable = $state('');
	let selectedTable = $state(null);
	let tableColumns = $state([]);
	let tableRows = $state([]);
	let tableTotalCount = $state(0);
	let isLoadingStudio = $state(false);
	let isLoadingTableData = $state(false);

	// Studio Dialogs state
	let showCreateTableDialog = $state(false);
	let newTableName = $state('');
	let newTableColumns = $state([
		{ name: 'name', type: 'VARCHAR(255)', nullable: false, defaultValue: '' }
	]);
	let isCreatingTable = $state(false);

	let showInsertRowDialog = $state(false);
	let newRowData = $state({});
	let isInsertingRow = $state(false);

	let showAddColumnDialog = $state(false);
	let newColName = $state('');
	let newColType = $state('VARCHAR(255)');
	let newColNullable = $state(true);
	let newColDefault = $state('');
	let isAddingColumn = $state(false);

	let showDropTableConfirm = $state(false);
	let isDroppingTable = $state(false);

	const columnTypeOptions = [
		{ value: 'VARCHAR(255)', label: 'VARCHAR(255) - Teks Pendek' },
		{ value: 'TEXT', label: 'TEXT - Teks Panjang' },
		{ value: 'INTEGER', label: 'INTEGER - Angka Bulat' },
		{ value: 'BIGINT', label: 'BIGINT - Angka Besar' },
		{ value: 'BOOLEAN', label: 'BOOLEAN - True/False' },
		{ value: 'TIMESTAMP WITH TIME ZONE', label: 'TIMESTAMP - Tanggal & Waktu' },
		{ value: 'NUMERIC', label: 'NUMERIC - Desimal / Uang' },
		{ value: 'JSONB', label: 'JSONB - JSON Data' }
	];

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
	let showNewPassword = $state(false);
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
	let showEditPassword = $state(false);
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
		const savedStudioDb = localStorage.getItem('app_studio_db');
		if (savedStudioDb) {
			selectedStudioDb = savedStudioDb;
		}
	});

	$effect(() => {
		if (data?.databases) {
			databases = data.databases;
			if (data.databases[0]) {
				if (selectedDb === 'neondb' && !data.databases.some((d) => d.name === 'neondb')) {
					selectedDb = data.databases[0].name;
				}
				if (!databases.some((d) => d.name === selectedStudioDb)) {
					selectedStudioDb = data.databases[0].name;
				}
			}
		}
		if (data?.admins) {
			admins = data.admins;
		}
	});

	$effect(() => {
		if (selectedStudioDb && selectedStudioDb !== currentLoadedDb) {
			currentLoadedDb = selectedStudioDb;
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('app_studio_db', selectedStudioDb);
			}
			loadStudioTables(selectedStudioDb);
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
			console.error('Refresh databases error:', err);
		} finally {
			isRefreshingDbs = false;
		}
	}

	async function handleCreateDatabase(e) {
		e.preventDefault();
		dbFeedback = { type: '', text: '' };

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
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({ dbName: cleanName })
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result.error || 'Gagal membuat database.');
			}

			if (!databases.some((d) => d.name === cleanName)) {
				databases = [...databases, { name: cleanName, size: '0 kB', encoding: 'UTF8' }];
			}

			newDbName = '';
			showCreateDbDialog = false;
			createdDbSuccess = cleanName;
			selectedStudioDb = cleanName;

			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('app_studio_db', cleanName);
			}

			await loadStudioTables(cleanName);
		} catch (err) {
			dbFeedback = { type: 'error', text: err.message };
		} finally {
			isCreatingDb = false;
		}
	}

	function getDbConnectionString(dbName, mode = 'pooled', masked = false) {
		if (!dbName) return '';
		const rawDirect = data?.rawDirectUrl || '';
		const rawPooled = data?.rawPooledUrl || rawDirect;

		let baseStr = mode === 'direct' ? rawDirect : rawPooled;
		if (!baseStr) baseStr = rawDirect || rawPooled || '';
		if (!baseStr) return '';

		try {
			const u = new URL(baseStr);
			u.pathname = `/${dbName}`;
			let connStr = u.toString();
			if (masked) {
				connStr = connStr.replace(/(:)([^@/]+)(@)/, '$1••••••••••••$3');
			}
			return connStr;
		} catch {
			return baseStr;
		}
	}

	let activeConnString = $derived.by(() => {
		if (connTab === 'direct') {
			return getDbConnectionString(selectedStudioDb, 'direct', !showConnPassword);
		}
		if (connTab === 'env') {
			return `DATABASE_URL="${getDbConnectionString(selectedStudioDb, 'pooled', !showConnPassword)}"`;
		}
		if (connTab === 'prisma') {
			return `// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // ${getDbConnectionString(selectedStudioDb, 'pooled', !showConnPassword)}
}`;
		}
		return getDbConnectionString(selectedStudioDb, 'pooled', !showConnPassword);
	});

	function copyConnectionStringText() {
		navigator.clipboard.writeText(activeConnString);
		copiedConnString = true;
		setTimeout(() => {
			copiedConnString = false;
		}, 2000);
	}

	async function loadStudioTables(dbName) {
		if (!dbName) return;
		isLoadingStudio = true;
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
					await loadTableData(dbName, tableToLoad);
				} else {
					selectedTable = null;
					tableColumns = [];
					tableRows = [];
					tableTotalCount = 0;
				}
			}
		} catch (err) {
			console.error('Error loading tables:', err);
		} finally {
			isLoadingStudio = false;
		}
	}

	async function loadTableData(dbName, tableName) {
		if (!dbName || !tableName) return;
		isLoadingTableData = true;
		try {
			const res = await fetch(`/api/studio?db=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`, {
				headers: masterKey.trim() ? { Authorization: `Bearer ${masterKey.trim()}` } : {}
			});
			const result = await res.json();
			if (res.ok) {
				tableColumns = result.columns || [];
				tableRows = result.rows || [];
				tableTotalCount = result.totalCount ?? result.rows?.length ?? 0;
			}
		} catch (err) {
			console.error('Error loading table data:', err);
		} finally {
			isLoadingTableData = false;
		}
	}

	async function handleCreateTable(e) {
		e.preventDefault();
		if (!newTableName.trim()) return;

		isCreatingTable = true;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'createTable',
					dbName: selectedStudioDb,
					tableName: newTableName.trim(),
					columns: newTableColumns
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal membuat tabel');

			showCreateTableDialog = false;
			const createdName = newTableName.trim();
			newTableName = '';
			newTableColumns = [{ name: 'name', type: 'VARCHAR(255)', nullable: false, defaultValue: '' }];

			await loadStudioTables(selectedStudioDb);
			selectedTable = createdName;
			await loadTableData(selectedStudioDb, createdName);
		} catch (err) {
			alert(err.message);
		} finally {
			isCreatingTable = false;
		}
	}

	function openInsertRowModal() {
		newRowData = {};
		for (const col of tableColumns) {
			if (col.isPrimary && col.type.toLowerCase().includes('int')) continue;
			if (col.name.toLowerCase() === 'created_at') continue;
			if (col.type.toLowerCase().includes('bool')) {
				newRowData[col.name] = 'true';
			} else {
				newRowData[col.name] = '';
			}
		}
		showInsertRowDialog = true;
	}

	async function handleInsertRow(e) {
		e.preventDefault();
		isInsertingRow = true;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'insertRow',
					dbName: selectedStudioDb,
					tableName: selectedTable,
					rowData: newRowData
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal menambahkan baris data');

			showInsertRowDialog = false;
			newRowData = {};
			await loadTableData(selectedStudioDb, selectedTable);
			const t = studioTables.find((item) => item.name === selectedTable);
			if (t) t.rowCount = (t.rowCount || 0) + 1;
		} catch (err) {
			alert(err.message);
		} finally {
			isInsertingRow = false;
		}
	}

	async function handleAddColumn(e) {
		e.preventDefault();
		if (!newColName.trim()) return;

		isAddingColumn = true;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'addColumn',
					dbName: selectedStudioDb,
					tableName: selectedTable,
					columnName: newColName.trim(),
					columnType: newColType,
					nullable: newColNullable,
					defaultValue: newColDefault.trim()
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal menambahkan kolom');

			showAddColumnDialog = false;
			newColName = '';
			newColType = 'VARCHAR(255)';
			newColNullable = true;
			newColDefault = '';

			await loadTableData(selectedStudioDb, selectedTable);
		} catch (err) {
			alert(err.message);
		} finally {
			isAddingColumn = false;
		}
	}

	async function handleDeleteRow(pkCol, pkVal) {
		if (!confirm('Apakah Anda yakin ingin menghapus baris data ini?')) return;
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
			if (!res.ok) throw new Error(result.error || 'Gagal menghapus baris');

			await loadTableData(selectedStudioDb, selectedTable);
			const t = studioTables.find((item) => item.name === selectedTable);
			if (t && t.rowCount > 0) t.rowCount -= 1;
		} catch (err) {
			alert(err.message);
		}
	}

	async function handleDropTable() {
		if (!selectedTable) return;
		isDroppingTable = true;
		try {
			const res = await fetch('/api/studio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: masterKey.trim() ? `Bearer ${masterKey.trim()}` : ''
				},
				body: JSON.stringify({
					action: 'dropTable',
					dbName: selectedStudioDb,
					tableName: selectedTable
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal menghapus tabel');

			showDropTableConfirm = false;
			await loadStudioTables(selectedStudioDb);
		} catch (err) {
			alert(err.message);
		} finally {
			isDroppingTable = false;
		}
	}

	function addColumnDefinition() {
		newTableColumns = [...newTableColumns, { name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: '' }];
	}

	function removeColumnDefinition(idx) {
		newTableColumns = newTableColumns.filter((_, i) => i !== idx);
	}

	let filteredStudioTables = $derived(
		studioTables.filter((t) => t.name.toLowerCase().includes(searchStudioTable.toLowerCase()))
	);

	let primaryKeyCol = $derived(
		tableColumns.find((c) => c.isPrimary)?.name || 'id'
	);

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
				showNewPassword = false;
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
					// Jika mengedit akun sendiri, otomatis logout dan alihkan ke login
					window.location.href = '/login';
					return;
				}
				selectedAdmin.email = editEmail.trim();
				selectedAdmin.role = editRole;
				showEditAdminDialog = false;
				await invalidateAll();
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
				<!-- TAB 1: DATABASE STUDIO & TABLE EXPLORER        -->
				<!-- ============================================== -->
				{#if activeTab === 'databases'}
					<div class="space-y-5 w-full">
						<!-- Bar Atas: Judul, Selector Database & Tombol Tambah Database -->
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<h2 class="text-xl font-bold tracking-tight text-slate-900">Database Studio & Table Explorer</h2>
								<p class="text-xs text-slate-400 mt-0.5">Kelola database Neon, salin connection string project, buat tabel, dan pantau data secara dinamis</p>
							</div>

							<div class="flex items-center gap-2.5">
								<!-- Dropdown Selector Database Aktif -->
								<div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
									<DatabaseIcon class="w-3.5 h-3.5 text-slate-400 ml-2 shrink-0" />
									<div class="w-44">
										<Combobox
											bind:value={selectedStudioDb}
											options={databases.map((db) => ({ value: db.name, label: db.name }))}
											placeholder="Pilih Database..."
											class="border-0 bg-transparent py-1 text-xs font-mono font-bold"
										/>
									</div>
								</div>

								<Button
									variant="outline"
									size="sm"
									disabled={isLoadingStudio}
									onclick={() => loadStudioTables(selectedStudioDb)}
									class="text-xs font-medium border-slate-200 h-9"
									title="Refresh data tabel"
								>
									<RefreshCwIcon class="w-3.5 h-3.5 {isLoadingStudio ? 'animate-spin' : ''}" />
								</Button>

								<Button
									size="sm"
									onclick={() => {
										dbFeedback = { type: '', text: '' };
										showCreateDbDialog = true;
									}}
									class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-9 px-3.5"
								>
									<PlusIcon class="w-3.5 h-3.5 mr-1" />
									Tambah Database
								</Button>
							</div>
						</div>

						<!-- Banner Notifikasi Saat Database Baru Berhasil Dibuat -->
						{#if createdDbSuccess}
							<Alert.Root class="rounded-2xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<CheckIcon class="w-4 h-4 text-emerald-600 shrink-0" />
										<span class="text-xs font-medium">
											Database <strong>"{createdDbSuccess}"</strong> berhasil dibuat di Neon Cloud! Connection string di bawah siap dipasang ke project Anda.
										</span>
									</div>
									<Button variant="ghost" size="sm" onclick={() => (createdDbSuccess = null)} class="text-xs text-emerald-800 h-6 px-2">
										Tutup
									</Button>
								</div>
							</Alert.Root>
						{/if}

						<!-- Card Sambungan Connection String untuk Project Baru -->
						<Card.Root class="border border-slate-100 shadow-xs rounded-2xl bg-white p-5 space-y-3">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
										<DatabaseIcon class="w-4 h-4" />
									</div>
									<div>
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-slate-900">Connection String:</span>
											<Badge variant="secondary" class="bg-emerald-50 text-emerald-700 border-0 font-mono text-[11px] font-bold">
												{selectedStudioDb}
											</Badge>
										</div>
										<p class="text-[11px] text-slate-400">Gunakan string ini di file <code>.env</code> project baru Anda untuk langsung terhubung ke database ini di Neon</p>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<ToggleGroup.Root type="single" value={connTab} onValueChange={(v) => { if (v) connTab = v; }} class="bg-slate-100 p-0.5 rounded-lg">
										<ToggleGroup.Item value="env" class="text-xs font-mono px-2.5 py-1 rounded-md data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-2xs">
											.env
										</ToggleGroup.Item>
										<ToggleGroup.Item value="pooled" class="text-xs font-mono px-2.5 py-1 rounded-md data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-2xs">
											Pooled URI
										</ToggleGroup.Item>
										<ToggleGroup.Item value="direct" class="text-xs font-mono px-2.5 py-1 rounded-md data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-2xs">
											Direct URI
										</ToggleGroup.Item>
										<ToggleGroup.Item value="prisma" class="text-xs font-mono px-2.5 py-1 rounded-md data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-2xs">
											Prisma
										</ToggleGroup.Item>
									</ToggleGroup.Root>

									<button
										type="button"
										onclick={() => (showConnPassword = !showConnPassword)}
										class="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
										title={showConnPassword ? 'Sembunyikan password' : 'Lihat password'}
									>
										{#if showConnPassword}
											<EyeOffIcon class="w-3.5 h-3.5" />
										{:else}
											<EyeIcon class="w-3.5 h-3.5" />
										{/if}
									</button>

									<Button
										size="sm"
										variant="outline"
										onclick={copyConnectionStringText}
										class="text-xs font-medium border-slate-200 h-8"
									>
										{#if copiedConnString}
											<CheckIcon class="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
											<span class="text-emerald-700 font-semibold">Tersalin!</span>
										{:else}
											<CopyIcon class="w-3.5 h-3.5 text-slate-500 mr-1.5" />
											<span>Salin String</span>
										{/if}
									</Button>
								</div>
							</div>

							<div class="relative bg-slate-900 text-slate-100 p-3 rounded-xl text-xs font-mono overflow-x-auto selection:bg-emerald-500 selection:text-white">
								<code>{activeConnString}</code>
							</div>
						</Card.Root>

						<!-- Studio Workspace: Kolom Kiri (Daftar Tabel) & Kolom Kanan (Viewer Data Dinamis) -->
						<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
							<!-- Kolom Kiri: Daftar Tabel di Database Terpilih -->
							<Card.Root class="lg:col-span-3 border border-slate-100 shadow-xs rounded-2xl bg-white p-4 space-y-3">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-1.5">
										<TableIcon class="w-4 h-4 text-slate-500" />
										<span class="text-xs font-bold text-slate-800">Tabel ({studioTables.length})</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => {
											newTableName = '';
											newTableColumns = [{ name: 'name', type: 'VARCHAR(255)', nullable: false, defaultValue: '' }];
											showCreateTableDialog = true;
										}}
										class="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-7 px-2 font-medium"
									>
										<PlusIcon class="w-3 h-3 mr-1" />
										Tabel Baru
									</Button>
								</div>

								<Input
									type="text"
									bind:value={searchStudioTable}
									placeholder="Cari tabel..."
									class="bg-slate-50/70 border-slate-200 text-xs rounded-lg h-8"
								/>

								<div class="space-y-1 max-h-[460px] overflow-y-auto pr-0.5">
									{#if isLoadingStudio}
										{#each [1, 2, 3] as _}
											<Skeleton class="h-8 w-full rounded-lg" />
										{/each}
									{:else if filteredStudioTables.length === 0}
										<div class="p-6 text-center text-slate-400 text-xs space-y-2">
											<p>Belum ada tabel pada database ini.</p>
											<Button
												variant="outline"
												size="sm"
												onclick={() => {
													newTableName = '';
													newTableColumns = [{ name: 'name', type: 'VARCHAR(255)', nullable: false, defaultValue: '' }];
													showCreateTableDialog = true;
												}}
												class="text-xs border-slate-200 mt-1"
											>
												+ Buat Tabel Pertama
											</Button>
										</div>
									{:else}
										{#each filteredStudioTables as t}
											<button
												type="button"
												onclick={() => {
													selectedTable = t.name;
													loadTableData(selectedStudioDb, t.name);
												}}
												class="w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer text-xs {selectedTable === t.name
													? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
													: 'hover:bg-slate-50 text-slate-700 font-medium'}"
											>
												<div class="flex items-center gap-2 truncate">
													<TableIcon class="w-3.5 h-3.5 {selectedTable === t.name ? 'text-emerald-600' : 'text-slate-400'}" />
													<span class="truncate">{t.name}</span>
												</div>
												<Badge variant="secondary" class="text-[10px] font-mono px-1.5 py-0 bg-slate-100 text-slate-600">
													{t.rowCount}
												</Badge>
											</button>
										{/each}
									{/if}
								</div>
							</Card.Root>

							<!-- Kolom Kanan: Viewer & Pengelola Data Tabel Dinamis -->
							<Card.Root class="lg:col-span-9 border border-slate-100 shadow-xs rounded-2xl bg-white overflow-hidden">
								{#if !selectedTable}
									<div class="p-16 text-center space-y-3">
										<TableIcon class="w-10 h-10 text-slate-300 mx-auto" />
										<p class="text-xs text-slate-400">Pilih tabel di panel samping atau buat tabel baru untuk mulai mengelola data secara dinamis.</p>
									</div>
								{:else}
									<!-- Table Header Actions -->
									<div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
										<div class="flex items-center gap-2.5">
											<div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
												<TableIcon class="w-4 h-4" />
											</div>
											<div>
												<div class="flex items-center gap-2">
													<span class="font-mono text-xs font-bold text-slate-900">public.{selectedTable}</span>
													<Badge variant="secondary" class="text-[10px] font-mono">
														{tableTotalCount} Baris
													</Badge>
												</div>
												<p class="text-[11px] text-slate-400">
													Database: <strong class="text-slate-700 font-mono">{selectedStudioDb}</strong>
													{#if primaryKeyCol}
														• Primary Key: <strong class="text-slate-700 font-mono">{primaryKeyCol}</strong>
													{/if}
												</p>
											</div>
										</div>

										<div class="flex items-center gap-1.5">
											<Button
												size="sm"
												onclick={openInsertRowModal}
												class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-8"
											>
												<PlusIcon class="w-3.5 h-3.5 mr-1" />
												Tambah Baris
											</Button>

											<Button
												variant="outline"
												size="sm"
												onclick={() => (showAddColumnDialog = true)}
												class="text-xs font-medium border-slate-200 h-8"
											>
												+ Tambah Kolom
											</Button>

											<Button
												variant="ghost"
												size="sm"
												onclick={() => loadTableData(selectedStudioDb, selectedTable)}
												class="text-xs text-slate-600 hover:text-slate-900 h-8 px-2"
												title="Refresh isi tabel"
											>
												<RefreshCwIcon class="w-3.5 h-3.5 {isLoadingTableData ? 'animate-spin' : ''}" />
											</Button>

											<Button
												variant="ghost"
												size="sm"
												onclick={() => (showDropTableConfirm = true)}
												class="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
												title="Hapus tabel ini"
											>
												<TrashIcon class="w-3.5 h-3.5" />
											</Button>
										</div>
									</div>

									<!-- Dynamic Table Data Container -->
									{#if isLoadingTableData}
										<div class="p-8 space-y-3">
											<Skeleton class="h-4 w-48 rounded" />
											<Skeleton class="h-40 w-full rounded-xl" />
										</div>
									{:else}
										<ScrollArea class="max-h-[500px] w-full overflow-x-auto">
											<Table.Root>
												<Table.Header class="bg-slate-50/70 border-b border-slate-100">
													<Table.Row>
														<Table.Head class="w-12 font-mono text-[11px] text-slate-400">#</Table.Head>
														{#each tableColumns as col}
															<Table.Head class="text-xs font-mono font-bold text-slate-800 whitespace-nowrap">
																<div class="flex items-center gap-1.5">
																	{#if col.isPrimary}
																		<KeyIcon class="w-3 h-3 text-amber-500 shrink-0" />
																	{/if}
																	<span>{col.name}</span>
																	<span class="text-[10px] font-normal text-slate-400">({col.type})</span>
																</div>
															</Table.Head>
														{/each}
														<!-- Kolom Terhubung Database (sesuai instruksi user) -->
														<Table.Head class="text-xs font-mono font-bold text-emerald-800 bg-emerald-50/60 uppercase whitespace-nowrap">
															DATABASE
														</Table.Head>
														<Table.Head class="text-right text-xs font-medium text-slate-500 w-16">
															AKSI
														</Table.Head>
													</Table.Row>
												</Table.Header>

												<Table.Body>
													{#if tableRows.length === 0}
														<Table.Row>
															<Table.Cell colspan={tableColumns.length + 3} class="text-center py-12 text-xs text-slate-400">
																Tabel ini belum memiliki data baris. Klik tombol "+ Tambah Baris" di atas atau isi melalui project baru Anda.
															</Table.Cell>
														</Table.Row>
													{:else}
														{#each tableRows as row, idx}
															<Table.Row class="hover:bg-slate-50/60">
																<Table.Cell class="font-mono text-xs text-slate-400">{idx + 1}</Table.Cell>
																{#each tableColumns as col}
																	<Table.Cell class="text-xs font-mono whitespace-nowrap">
																		{#if row[col.name] === null || row[col.name] === undefined}
																			<span class="text-slate-300 italic">null</span>
																		{:else if typeof row[col.name] === 'boolean'}
																			<Badge variant={row[col.name] ? 'secondary' : 'outline'} class="text-[10px] {row[col.name] ? 'bg-emerald-50 text-emerald-700 border-0' : 'text-slate-500'}">
																				{row[col.name] ? 'true' : 'false'}
																			</Badge>
																		{:else if col.type.toLowerCase().includes('timestamp') || col.type.toLowerCase().includes('date')}
																			<span class="text-slate-600">
																				{new Date(row[col.name]).toLocaleString('id-ID')}
																			</span>
																		{:else if typeof row[col.name] === 'object'}
																			<span class="text-slate-600 truncate max-w-xs block font-mono text-[11px]" title={JSON.stringify(row[col.name])}>
																				{JSON.stringify(row[col.name])}
																			</span>
																		{:else}
																			<span class="text-slate-900 font-medium">
																				{String(row[col.name])}
																			</span>
																		{/if}
																	</Table.Cell>
																{/each}

																<!-- Kolom Terhubung Database (sesuai instruksi user) -->
																<Table.Cell class="text-xs font-mono whitespace-nowrap">
																	<Badge variant="outline" class="font-mono text-[10px] text-emerald-700 bg-emerald-50/80 border-emerald-200">
																		<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
																		{selectedStudioDb}
																	</Badge>
																</Table.Cell>

																<!-- Kolom Aksi Hapus Baris -->
																<Table.Cell class="text-right">
																	<Button
																		variant="ghost"
																		size="sm"
																		onclick={() => handleDeleteRow(primaryKeyCol, row[primaryKeyCol])}
																		class="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-7 px-2"
																		title="Hapus baris ini"
																	>
																		<TrashIcon class="w-3.5 h-3.5" />
																	</Button>
																</Table.Cell>
															</Table.Row>
														{/each}
													{/if}
												</Table.Body>
											</Table.Root>
										</ScrollArea>
									{/if}
								{/if}
							</Card.Root>
						</div>
					</div>

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
					class="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
				>
					{isUpdatingAdmin ? 'Memperbarui...' : (isSelf(selectedAdmin) ? 'Simpan & Login Ulang' : 'Simpan Perubahan')}
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

<!-- ============================================== -->
<!-- DIALOG 4: BUAT TABEL BARU                      -->
<!-- ============================================== -->
<Dialog.Root bind:open={showCreateTableDialog}>
	<Dialog.Content class="sm:max-w-xl bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">Buat Tabel Baru</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				Tabel baru akan dibuat pada database <strong class="text-slate-800 font-mono">{selectedStudioDb}</strong> di Neon Cloud.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreateTable} class="space-y-4 pt-2">
			<div>
				<label for="table-name-input" class="block text-xs font-medium text-slate-700 mb-1.5">Nama Tabel</label>
				<Input
					id="table-name-input"
					type="text"
					bind:value={newTableName}
					required
					placeholder="contoh: users, orders, products"
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
				<span class="text-[11px] text-slate-400 mt-1 block">Hanya huruf kecil, angka, atau underscore.</span>
			</div>

			<!-- Definisi Kolom -->
			<div class="space-y-2 pt-1">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold text-slate-800">Struktur Kolom</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={addColumnDefinition}
						class="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-7 px-2 font-medium"
					>
						<PlusIcon class="w-3 h-3 mr-1" />
						Tambah Kolom
					</Button>
				</div>

				<div class="p-3 bg-slate-50/60 border border-slate-100 rounded-xl text-xs flex items-center justify-between text-slate-500 font-mono">
					<div class="flex items-center gap-2">
						<KeyIcon class="w-3.5 h-3.5 text-amber-500" />
						<span class="font-bold text-slate-800">id</span>
						<Badge variant="outline" class="text-[10px]">SERIAL PRIMARY KEY</Badge>
					</div>
					<span class="text-[10px] text-slate-400">Otomatis / Default</span>
				</div>

				<div class="space-y-2 max-h-56 overflow-y-auto pr-1">
					{#each newTableColumns as col, idx}
						<div class="p-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2 text-xs">
							<div class="flex items-center gap-2">
								<Input
									type="text"
									bind:value={col.name}
									placeholder="Nama kolom (misal: title)"
									required
									class="bg-white border-slate-200 text-xs font-mono rounded-lg flex-1 h-8"
								/>
								<div class="w-48">
									<Combobox
										bind:value={col.type}
										options={columnTypeOptions}
										placeholder="Tipe Data"
										class="h-8 py-1 bg-white text-xs"
									/>
								</div>
								{#if newTableColumns.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => removeColumnDefinition(idx)}
										class="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
									>
										<TrashIcon class="w-3.5 h-3.5" />
									</Button>
								{/if}
							</div>
							<div class="flex items-center gap-2 px-1">
								<label class="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
									<input type="checkbox" bind:checked={col.nullable} class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
									<span>Boleh kosong (Nullable)</span>
								</label>
							</div>
						</div>
					{/each}
				</div>

				<div class="p-3 bg-slate-50/60 border border-slate-100 rounded-xl text-xs flex items-center justify-between text-slate-500 font-mono">
					<div class="flex items-center gap-2">
						<span class="font-bold text-slate-800">created_at</span>
						<Badge variant="outline" class="text-[10px]">TIMESTAMP WITH TIME ZONE</Badge>
					</div>
					<span class="text-[10px] text-slate-400">Otomatis / CURRENT_TIMESTAMP</span>
				</div>
			</div>

			<div class="pt-3 flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					onclick={() => (showCreateTableDialog = false)}
					class="text-xs text-slate-600 hover:text-slate-900"
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isCreatingTable}
					class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
				>
					{isCreatingTable ? 'Membuat...' : 'Buat Tabel'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- DIALOG 5: TAMBAH BARIS DATA                    -->
<!-- ============================================== -->
<Dialog.Root bind:open={showInsertRowDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">Tambah Baris Baru</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				Masukkan nilai data untuk tabel <strong class="text-slate-800 font-mono">public.{selectedTable}</strong> pada database <strong class="text-slate-800 font-mono">{selectedStudioDb}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleInsertRow} class="space-y-3.5 pt-2 max-h-[60vh] overflow-y-auto pr-1">
			{#each tableColumns as col}
				{#if !(col.isPrimary && col.type.toLowerCase().includes('int')) && col.name.toLowerCase() !== 'created_at'}
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="row-{col.name}" class="text-xs font-medium text-slate-700">
								{col.name}
							</label>
							<span class="text-[10px] font-mono text-slate-400">({col.type})</span>
						</div>

						{#if col.type.toLowerCase().includes('bool')}
							<Combobox
								id="row-{col.name}"
								bind:value={newRowData[col.name]}
								options={[
									{ value: 'true', label: 'true (Benar)' },
									{ value: 'false', label: 'false (Salah)' }
								]}
								placeholder="Pilih Boolean"
								class="h-8 py-1 text-xs"
							/>
						{:else}
							<Input
								id="row-{col.name}"
								type={col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('numeric') ? 'number' : 'text'}
								bind:value={newRowData[col.name]}
								placeholder={col.nullable ? 'Opsional (NULL)...' : 'Wajib diisi...'}
								class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg h-8"
							/>
						{/if}
					</div>
				{/if}
			{/each}

			<div class="pt-3 flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					onclick={() => (showInsertRowDialog = false)}
					class="text-xs text-slate-600 hover:text-slate-900"
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isInsertingRow}
					class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
				>
					{isInsertingRow ? 'Menyimpan...' : 'Simpan Data'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- DIALOG 6: TAMBAH KOLOM BARU                    -->
<!-- ============================================== -->
<Dialog.Root bind:open={showAddColumnDialog}>
	<Dialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-bold text-slate-900">Tambah Kolom Baru</Dialog.Title>
			<Dialog.Description class="text-xs text-slate-400">
				Tambahkan kolom baru ke tabel <strong class="text-slate-800 font-mono">public.{selectedTable}</strong> pada database <strong class="text-slate-800 font-mono">{selectedStudioDb}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleAddColumn} class="space-y-3.5 pt-2">
			<div>
				<label for="new-col-name" class="block text-xs font-medium text-slate-700 mb-1.5">Nama Kolom</label>
				<Input
					id="new-col-name"
					type="text"
					bind:value={newColName}
					required
					placeholder="contoh: phone, is_active, bio"
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
			</div>

			<div>
				<label for="new-col-type" class="block text-xs font-medium text-slate-700 mb-1.5">Tipe Data</label>
				<Combobox
					id="new-col-type"
					bind:value={newColType}
					options={columnTypeOptions}
					placeholder="Pilih Tipe Data"
				/>
			</div>

			<div>
				<label for="new-col-default" class="block text-xs font-medium text-slate-700 mb-1.5">Nilai Default (Opsional)</label>
				<Input
					id="new-col-default"
					type="text"
					bind:value={newColDefault}
					placeholder="contoh: active, 0"
					class="bg-slate-50/70 border-slate-200 text-xs font-mono rounded-lg"
				/>
			</div>

			<div class="pt-1">
				<label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
					<input type="checkbox" bind:checked={newColNullable} class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
					<span>Boleh kosong (Nullable)</span>
				</label>
			</div>

			<div class="pt-3 flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					onclick={() => (showAddColumnDialog = false)}
					class="text-xs text-slate-600 hover:text-slate-900"
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isAddingColumn}
					class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
				>
					{isAddingColumn ? 'Menambahkan...' : 'Tambah Kolom'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ============================================== -->
<!-- ALERT DIALOG: KONFIRMASI HAPUS TABEL           -->
<!-- ============================================== -->
<AlertDialog.Root bind:open={showDropTableConfirm}>
	<AlertDialog.Content class="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-6">
		<AlertDialog.Header class="space-y-1">
			<AlertDialog.Title class="text-base font-bold text-slate-900">Hapus Tabel Ini?</AlertDialog.Title>
			<AlertDialog.Description class="text-xs text-slate-400">
				Apakah Anda yakin ingin menghapus tabel <strong>public.{selectedTable}</strong> dari database <strong>{selectedStudioDb}</strong>? Seluruh data di dalamnya akan terhapus secara permanen.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer class="pt-4 flex justify-end gap-2">
			<AlertDialog.Cancel class="text-xs border-slate-200">
				Batal
			</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDropTable}
				disabled={isDroppingTable}
				class="text-xs bg-rose-600 hover:bg-rose-700 text-white"
			>
				{isDroppingTable ? 'Menghapus...' : 'Ya, Hapus Tabel'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
