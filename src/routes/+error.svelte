<script>
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import HomeIcon from '@lucide/svelte/icons/home';
</script>

<svelte:head>
	<title>Error {page.status} | Database Gateway</title>
</svelte:head>

<div class="min-h-screen bg-slate-50/60 flex items-center justify-center p-4">
	<Card.Root class="w-full max-w-md border border-slate-100 shadow-xl rounded-2xl bg-white p-8 text-center space-y-6">
		<div class="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
			<AlertCircleIcon class="w-7 h-7" />
		</div>

		<div class="space-y-2">
			<div class="inline-flex items-center gap-2">
				<Badge variant="outline" class="border-rose-200 text-rose-700 bg-rose-50/50 font-mono text-xs px-2.5 py-0.5">
					HTTP {page.status}
				</Badge>
			</div>
			<h1 class="text-xl font-bold tracking-tight text-slate-900">
				{page.status === 404 ? 'Halaman Tidak Ditemukan' : 'Terjadi Kesalahan Server'}
			</h1>
			<p class="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
				{page.error?.message || 'Sistem mendeteksi kendala pada server. Silakan refresh halaman atau kembali ke dashboard.'}
			</p>
		</div>

		<div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
			<Button
				variant="outline"
				class="w-full sm:w-auto rounded-xl border-slate-200 text-xs font-semibold gap-2"
				onclick={() => window.location.reload()}
			>
				<RefreshCwIcon class="w-3.5 h-3.5" />
				Muat Ulang Halaman
			</Button>

			<Button
				class="w-full sm:w-auto rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold gap-2"
				onclick={() => window.location.href = '/'}
			>
				<HomeIcon class="w-3.5 h-3.5" />
				Kembali ke Dashboard
			</Button>
		</div>
	</Card.Root>
</div>

