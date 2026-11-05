<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';

	let {
		masterKey = $bindable(''),
		neonBranch = 'production',
		neonEndpoint = 'Neon Cloud',
		hasNeonAuth = false,
		hasRealtime = false
	} = $props();

	let showKey = $state(false);
	let keySavedNotice = $state(false);

	function saveMasterKey() {
		localStorage.setItem('app_master_key', masterKey);
		keySavedNotice = true;
		setTimeout(() => {
			keySavedNotice = false;
		}, 2000);
	}
</script>

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
				<Card.Description class="text-xs text-slate-400">
					Digunakan untuk otorisasi bearer token di endpoint <code class="font-mono text-slate-700">/api/query</code>
				</Card.Description>
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
						<Badge variant="secondary" class="font-mono font-bold text-slate-900">{neonBranch}</Badge>
					</div>
					<div class="flex justify-between py-1.5 border-b border-slate-100/60">
						<span class="text-slate-400">Database Host</span>
						<span class="font-mono text-slate-700 truncate max-w-[200px]" title={neonEndpoint}>{neonEndpoint}</span>
					</div>
					<div class="flex justify-between py-1.5 border-b border-slate-100/60">
						<span class="text-slate-400">Neon Auth</span>
						<span class="font-semibold text-emerald-600">{hasNeonAuth ? 'Terkoneksi' : 'Siap'}</span>
					</div>
					<div class="flex justify-between py-1.5 border-b border-slate-100/60">
						<span class="text-slate-400">Neon Realtime</span>
						<span class="font-semibold text-emerald-600">{hasRealtime ? 'Tersedia' : 'Aktif'}</span>
					</div>
					<div class="flex justify-between py-1.5">
						<span class="text-slate-400">Driver</span>
						<span class="font-mono font-semibold text-slate-800">pg (node-postgres)</span>
					</div>
				</div>
			</div>
		</Card.Root>
	</div>

	<!-- Panduan & FAQ Accordion -->
	<Card.Root class="border border-slate-100 rounded-2xl p-6 shadow-xs bg-white space-y-4">
		<div>
			<Card.Title class="text-sm font-bold text-slate-900">Panduan & Informasi Gateway</Card.Title>
			<Card.Description class="text-xs text-slate-400">Pertanyaan umum seputar arsitektur dan integrasi database</Card.Description>
		</div>

		<Accordion.Root type="single" class="w-full">
			<Accordion.Item value="item-1">
				<Accordion.Trigger class="text-xs font-semibold text-slate-800 hover:text-emerald-700">
					Bagaimana cara project luar mengeksekusi query melalui API Gateway?
				</Accordion.Trigger>
				<Accordion.Content class="text-xs text-slate-500 leading-relaxed pt-2">
					Kirimkan HTTP POST request ke <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/api/query</code> dengan header <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Authorization: Bearer &lt;APP_MASTER_KEY&gt;</code> dan <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700">x-database-name: &lt;nama_db&gt;</code>. Body request berisi JSON <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700">&#123; "sql": "...", "params": [...] &#125;</code>.
				</Accordion.Content>
			</Accordion.Item>

			<Accordion.Item value="item-2">
				<Accordion.Trigger class="text-xs font-semibold text-slate-800 hover:text-emerald-700">
					Bagaimana jika saya ingin menghubungkan ORM seperti Prisma atau Drizzle langsung ke Neon?
				</Accordion.Trigger>
				<Accordion.Content class="text-xs text-slate-500 leading-relaxed pt-2">
					Gunakan tab <strong>Database Studio</strong>, pilih database yang diinginkan, lalu salin connection string pada tab <strong>.env</strong> atau <strong>Prisma</strong>. String tersebut sudah otomatis mengarahkan ke database yang dipilih di Neon Cloud.
				</Accordion.Content>
			</Accordion.Item>

			<Accordion.Item value="item-3">
				<Accordion.Trigger class="text-xs font-semibold text-slate-800 hover:text-emerald-700">
					Apakah akun saya aman saat mengubah kredensial sendiri?
				</Accordion.Trigger>
				<Accordion.Content class="text-xs text-slate-500 leading-relaxed pt-2">
					Ya, jika Anda mengedit email atau password akun yang sedang login saat ini, sistem akan secara otomatis mengakhiri sesi (logout) dan meminta Anda melakukan login ulang demi menjaga integritas otentikasi.
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	</Card.Root>
</div>

