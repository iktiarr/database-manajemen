<script>
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

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

<Sidebar.Root class="w-64 border-r border-neutral-200 bg-white flex flex-col shrink-0">
	<!-- Panel Brand / Title -->
	<Sidebar.Header class="p-5 border-b border-neutral-100">
		<div>
			<h1 class="text-sm font-semibold tracking-tight text-neutral-900">Database Gateway</h1>
			<p class="text-[11px] text-neutral-400 font-normal">Konsol Manajemen</p>
		</div>
	</Sidebar.Header>

	<!-- Panel Navigation -->
	<Sidebar.Content class="p-3 space-y-6 flex-1">
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
				Menu Utama
			</Sidebar.GroupLabel>
			<Sidebar.Menu class="space-y-1 mt-1.5">
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'databases'}
						onclick={() => onTabChange('databases')}
						class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'databases'
							? 'bg-black text-white font-semibold'
							: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}"
					>
						<span>Proyek</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'realtime'}
						onclick={() => onTabChange('realtime')}
						class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'realtime'
							? 'bg-black text-white font-semibold'
							: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}"
					>
						<span>Neon Realtime</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'storage'}
						onclick={() => onTabChange('storage')}
						class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'storage'
							? 'bg-black text-white font-semibold'
							: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}"
					>
						<span>S3 Storage</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'auth'}
						onclick={() => onTabChange('auth')}
						class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'auth'
							? 'bg-black text-white font-semibold'
							: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}"
					>
						<span>Neon Auth</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'admins'}
						onclick={() => onTabChange('admins')}
						class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'admins'
							? 'bg-black text-white font-semibold'
							: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}"
					>
						<span>Kelola Admin</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>

				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={activeTab === 'settings'}
						onclick={() => onTabChange('settings')}
						class="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer {activeTab === 'settings'
							? 'bg-black text-white font-semibold'
							: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}"
					>
						<span>API Key & Pengaturan</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>

	<!-- Panel Footer (User Profile & Konfirmasi Keluar) -->
	<Sidebar.Footer class="p-3 bg-white border-t border-neutral-100">
		<div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
			<div class="flex items-center gap-2.5 min-w-0">
				<Avatar.Root class="w-7 h-7 rounded-full border border-neutral-200 bg-white">
					<Avatar.Fallback class="bg-neutral-100 text-neutral-800 font-semibold text-[11px]">
						{getInitials(currentAdmin?.email)}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-medium text-neutral-800 truncate" title={currentAdmin?.email}>
						{currentAdmin?.email || 'Admin'}
					</p>
					<p class="text-[10px] text-neutral-400 capitalize">
						{currentAdmin?.role || 'Superadmin'}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-1 shrink-0">
				<Button
					variant="ghost"
					size="sm"
					onclick={onChangePasswordClick}
					class="text-[11px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 h-7 px-1.5 rounded-md"
					title="Ubah Password Admin"
				>
					Password
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={onLogoutClick}
					class="text-[11px] text-neutral-500 hover:text-rose-600 hover:bg-rose-50 h-7 px-1.5 rounded-md"
				>
					Keluar
				</Button>
			</div>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>
