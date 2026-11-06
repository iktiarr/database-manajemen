<script>
	import { onMount } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import LogoutDialog from '$lib/components/layout/LogoutDialog.svelte';
	import ChangeAdminPasswordDialog from '$lib/components/layout/ChangeAdminPasswordDialog.svelte';
	import DatabaseStudio from '$lib/components/studio/DatabaseStudio.svelte';
	import RealtimeManager from '$lib/components/realtime/RealtimeManager.svelte';
	import StorageManager from '$lib/components/storage/StorageManager.svelte';
	import AuthManager from '$lib/components/auth/AuthManager.svelte';
	import AdminManager from '$lib/components/admins/AdminManager.svelte';
	import GatewaySettings from '$lib/components/settings/GatewaySettings.svelte';

	let { data } = $props();

	// Navigation tab state
	let activeTab = $state('databases'); // 'databases' | 'realtime' | 'storage' | 'auth' | 'admins' | 'settings'

	function setActiveTab(tab) {
		activeTab = tab;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('app_active_tab', tab);
		}
	}

	// Master Key state (shared between tabs)
	let masterKey = $state('');

	// Logout dialog state
	let showLogoutConfirm = $state(false);

	// Change admin password dialog state
	let showChangePasswordDialog = $state(false);

	// Databases & Admins reactive state
	let databases = $state([]);
	let admins = $state([]);

	onMount(() => {
		const savedKey = localStorage.getItem('app_master_key');
		if (savedKey) {
			masterKey = savedKey;
		}

		const savedTab = localStorage.getItem('app_active_tab');
		if (savedTab && ['databases', 'realtime', 'storage', 'auth', 'admins', 'settings'].includes(savedTab)) {
			activeTab = savedTab;
		}
	});

	$effect(() => {
		if (data?.databases) {
			databases = data.databases;
		}
		if (data?.admins) {
			admins = data.admins;
		}
	});
</script>

<Sidebar.Provider>
	<div class="flex min-h-screen w-full bg-neutral-50/60 text-neutral-900 font-sans antialiased">
		<!-- Sidebar Navigation Component -->
		<AppSidebar
			{activeTab}
			currentAdmin={data?.currentAdmin}
			onTabChange={setActiveTab}
			onLogoutClick={() => (showLogoutConfirm = true)}
			onChangePasswordClick={() => (showChangePasswordDialog = true)}
		/>

		<!-- Main Inset Content Area -->
		<Sidebar.Inset class="flex-1 flex flex-col min-w-0 bg-neutral-50/60 w-full">
			<main class="flex-1 p-5 md:p-8 space-y-6 w-full max-w-7xl mx-auto">
				{#if activeTab === 'databases'}
					<DatabaseStudio
						bind:databases
						rawDirectUrl={data?.rawDirectUrl}
						rawPooledUrl={data?.rawPooledUrl}
						{masterKey}
					/>
				{:else if activeTab === 'realtime'}
					<RealtimeManager
						{databases}
						initialSecret={data?.neonRealtimeSecret || ''}
					/>
				{:else if activeTab === 'storage'}
					<StorageManager />
				{:else if activeTab === 'auth'}
					<AuthManager />
				{:else if activeTab === 'admins'}
					<AdminManager
						bind:admins
						currentAdmin={data?.currentAdmin}
					/>
				{:else if activeTab === 'settings'}
					<GatewaySettings
						bind:masterKey
						neonBranch={data?.neonBranch}
						neonEndpoint={data?.neonEndpoint}
						hasNeonAuth={data?.hasNeonAuth}
						hasRealtime={data?.hasRealtime}
					/>
				{/if}
			</main>
		</Sidebar.Inset>
	</div>
</Sidebar.Provider>

<!-- Konfirmasi Keluar Dialog -->
<LogoutDialog bind:open={showLogoutConfirm} />

<!-- Ubah Password Admin Dialog -->
<ChangeAdminPasswordDialog
	bind:open={showChangePasswordDialog}
	currentAdmin={data?.currentAdmin}
/>
