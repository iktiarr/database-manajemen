<script>
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import CodeIcon from '@lucide/svelte/icons/code';
	import UsersIcon from '@lucide/svelte/icons/users';
	import KeyIcon from '@lucide/svelte/icons/key';

	let {
		activeTab = 'databases',
		currentAdmin = null,
		onTabChange = () => {},
		onLogoutClick = () => {},
		onChangePasswordClick = () => {}
	} = $props();

	function getInitials(email = '') {
		if (!email) return 'AD';
		const clean = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
		if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
		return clean.toUpperCase() || 'AD';
	}
</script>

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
						onclick={() => onTabChange('databases')}
						class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'databases'
							? 'bg-slate-900 text-white font-semibold shadow-xs'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
					>
						<DatabaseIcon class="w-3.5 h-3.5 {activeTab === 'databases' ? 'text-white' : 'text-slate-400'}" />
						<span>Projects</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'query'}
						onclick={() => onTabChange('query')}
						class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'query'
							? 'bg-slate-900 text-white font-semibold shadow-xs'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
					>
						<CodeIcon class="w-3.5 h-3.5 {activeTab === 'query' ? 'text-white' : 'text-slate-400'}" />
						<span>Query Console</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'admins'}
						onclick={() => onTabChange('admins')}
						class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'admins'
							? 'bg-slate-900 text-white font-semibold shadow-xs'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
					>
						<UsersIcon class="w-3.5 h-3.5 {activeTab === 'admins' ? 'text-white' : 'text-slate-400'}" />
						<span>Master Admins</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'settings'}
						onclick={() => onTabChange('settings')}
						class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'settings'
							? 'bg-slate-900 text-white font-semibold shadow-xs'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
					>
						<KeyIcon class="w-3.5 h-3.5 {activeTab === 'settings' ? 'text-white' : 'text-slate-400'}" />
						<span>API Key & Settings</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>

	<!-- Panel Footer (User Profile & Konfirmasi Keluar) -->
	<Sidebar.Footer class="p-3 bg-white">
		<div class="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100/60">
			<div class="flex items-center gap-2.5 min-w-0">
				<Avatar.Root class="w-8 h-8 rounded-full border border-slate-200 bg-white">
					<Avatar.Fallback class="bg-emerald-100 text-emerald-800 font-bold text-xs">
						{getInitials(currentAdmin?.email)}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-bold text-slate-800 truncate" title={currentAdmin?.email}>
						{currentAdmin?.email || 'Admin'}
					</p>
					<Badge variant="outline" class="text-[9px] px-1 py-0 uppercase font-semibold text-emerald-700 bg-emerald-50/60 border-emerald-200">
						{currentAdmin?.role || 'Superadmin'}
					</Badge>
				</div>
			</div>

			<div class="flex items-center gap-1 shrink-0">
				<Button
					variant="ghost"
					size="sm"
					onclick={onChangePasswordClick}
					class="text-xs text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 h-7 w-7 p-0 rounded-lg"
					title="Ubah Password Admin"
				>
					<KeyIcon class="w-3.5 h-3.5" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={onLogoutClick}
					class="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-7 px-2 rounded-lg"
				>
					Keluar
				</Button>
			</div>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>

