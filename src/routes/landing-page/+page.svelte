<script>
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import RadioIcon from '@lucide/svelte/icons/radio';
	import CodeIcon from '@lucide/svelte/icons/code';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import LockIcon from '@lucide/svelte/icons/lock';
	import GlobeIcon from '@lucide/svelte/icons/globe';

	let activeDemoTab = $state('realtime'); // 'realtime' | 'storage' | 'gateway'

	const features = [
		{
			icon: DatabaseIcon,
			title: 'Provisi Database Instan',
			desc: 'Buat, hapus, dan isolasi database project secara dinamis tanpa downtime melalui arsitektur serverless Neon PostgreSQL.',
			tag: 'Serverless DB',
			gradient: 'from-emerald-500/20 to-teal-500/10'
		},
		{
			icon: RadioIcon,
			title: 'Neon Realtime SQL',
			desc: 'Langganan query SQL secara langsung via WebSocket. Data berubah langsung ter-stream ke aplikasi tanpa perlu Redis pub/sub.',
			tag: 'Live WebSocket',
			gradient: 'from-cyan-500/20 to-blue-500/10'
		},
		{
			icon: HardDriveIcon,
			title: 'S3-Compatible Storage',
			desc: 'Penyimpanan objek kompatibel AWS S3 terintegrasi dengan pembuatan presigned URL aman untuk upload & download berjangka waktu.',
			tag: 'Object Store',
			gradient: 'from-amber-500/20 to-orange-500/10'
		},
		{
			icon: ShieldCheckIcon,
			title: 'Neon Auth & JWKS',
			desc: 'Validasi token JWT stateless dari edge menggunakan remote JWKS (.well-known/jwks.json) dengan standar OAuth 2.0 / OIDC.',
			tag: 'Stateless Auth',
			gradient: 'from-purple-500/20 to-indigo-500/10'
		},
		{
			icon: CodeIcon,
			title: 'Universal Query Gateway',
			desc: 'Satu endpoint broker /api/query untuk mengeksekusi SQL parameterized ke database mana saja dengan otorisasi Master API Key.',
			tag: 'API Broker',
			gradient: 'from-pink-500/20 to-rose-500/10'
		},
		{
			icon: LockIcon,
			title: 'Keamanan Superadmin',
			desc: 'Manajemen otentikasi admin berbasis sesi terenkripsi PBKDF2/scrypt, proteksi IDOR, dan kontrol hak akses berlapis.',
			tag: 'Zero Trust',
			gradient: 'from-emerald-500/20 to-lime-500/10'
		}
	];
</script>

<svelte:head>
	<title>Database Gateway | Modern Serverless PostgreSQL & Realtime Cloud</title>
	<meta name="description" content="Platform Manajemen Database Serverless & Realtime Cloud terpadu untuk PostgreSQL, WebSocket live stream, S3 Storage, dan Auth." />
</svelte:head>

<div class="min-h-screen bg-[#07090e] text-neutral-100 selection:bg-emerald-500 selection:text-black font-sans relative overflow-x-hidden">
	<!-- Background Ambient Glow Orbs -->
	<div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
		<div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-emerald-600/20 via-cyan-600/15 to-purple-600/10 blur-[130px] rounded-full"></div>
		<div class="absolute top-[40%] -left-32 w-[500px] h-[500px] bg-emerald-700/10 blur-[140px] rounded-full"></div>
		<div class="absolute top-[60%] -right-32 w-[550px] h-[550px] bg-purple-700/10 blur-[150px] rounded-full"></div>
	</div>

	<!-- Sticky Header Navbar -->
	<header class="sticky top-0 z-50 backdrop-blur-xl bg-[#07090e]/75 border-b border-neutral-800/60">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<!-- Brand Logo -->
			<a href="/landing-page" class="flex items-center gap-2.5 group">
				<div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-black font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
					<DatabaseIcon class="w-5 h-5 text-black" />
				</div>
				<div class="flex flex-col">
					<span class="text-sm font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
						Database Gateway
					</span>
					<span class="text-[10px] text-neutral-400 font-mono">Neon Cloud Console</span>
				</div>
			</a>

			<!-- Navigation Links -->
			<nav class="hidden md:flex items-center gap-8 text-xs font-medium text-neutral-400">
				<a href="#fitur" class="hover:text-white transition-colors">Fitur Utama</a>
				<a href="#realtime" class="hover:text-white transition-colors">Neon Realtime</a>
				<a href="#storage" class="hover:text-white transition-colors">S3 Storage</a>
				<a href="#arsitektur" class="hover:text-white transition-colors">Arsitektur</a>
				<a href="#portofolio" class="hover:text-white transition-colors">Portofolio</a>
			</nav>

			<!-- Action Button -->
			<div class="flex items-center gap-3">
				<a
					href="/login"
					class="text-xs px-3.5 py-2 text-neutral-300 hover:text-white font-medium transition"
				>
					Masuk Admin
				</a>
				<a
					href="/"
					class="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-semibold shadow-md shadow-emerald-500/20 hover:opacity-95 hover:shadow-emerald-500/30 transition cursor-pointer"
				>
					<span>Buka Dashboard</span>
					<ArrowRightIcon class="w-3.5 h-3.5" />
				</a>
			</div>
		</div>
	</header>

	<main class="relative z-10 space-y-28 pb-24">
		<!-- ============================================== -->
		<!-- HERO SECTION                                   -->
		<!-- ============================================== -->
		<section class="pt-20 sm:pt-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8">
			<!-- Announcement Badge -->
			<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-emerald-300 text-xs font-medium shadow-sm hover:border-emerald-500/50 transition">
				<SparklesIcon class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
				<span>Portofolio Full-Stack SaaS • Database Gateway v2.0</span>
				<span class="w-1 h-1 rounded-full bg-emerald-400"></span>
				<span class="text-neutral-400 font-mono text-[11px]">SvelteKit 3 + Neon</span>
			</div>

			<!-- Main Headline -->
			<h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
				Platform Manajemen Database <br class="hidden sm:inline" />
				<span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
					Serverless & Realtime Cloud
				</span>
			</h1>

			<!-- Subtitle -->
			<p class="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
				Kelola database multi-tenant secara instan, dengarkan query secara realtime via WebSocket, simpan aset di object store kompatibel S3, dan amankan dengan Neon Auth stateless JWKS.
			</p>

			<!-- Action Buttons -->
			<div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
				<a
					href="/"
					class="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition flex items-center justify-center gap-2 group"
				>
					<span>Jelajahi Dashboard Sistem</span>
					<ArrowRightIcon class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
				</a>
				<a
					href="#fitur"
					class="w-full sm:w-auto px-6 py-3 rounded-xl border border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-200 font-medium text-xs sm:text-sm backdrop-blur-sm transition flex items-center justify-center gap-2"
				>
					<span>Lihat Spesifikasi Fitur</span>
				</a>
			</div>

			<!-- App Mockup Preview Visual -->
			<div class="pt-10 max-w-5xl mx-auto">
				<div class="relative p-2 rounded-2xl bg-gradient-to-b from-neutral-700/40 to-neutral-800/10 border border-neutral-700/60 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl">
					<!-- Window Header Bar -->
					<div class="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/80 bg-neutral-950/70 rounded-t-xl text-xs font-mono text-neutral-400">
						<div class="flex items-center gap-2">
							<span class="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
							<span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
							<span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
							<span class="ml-2 text-neutral-300 font-sans text-xs font-medium">Database Gateway — Console Workspace</span>
						</div>
						<div class="flex items-center gap-3 text-[11px]">
							<span class="text-emerald-400 flex items-center gap-1">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
								Neon Cloud Online
							</span>
							<span class="text-neutral-500">ap-southeast-1</span>
						</div>
					</div>

					<!-- Mockup Content Grid -->
					<div class="grid grid-cols-1 md:grid-cols-4 bg-neutral-950/90 rounded-b-xl text-left overflow-hidden divide-y md:divide-y-0 md:divide-x divide-neutral-800/80">
						<!-- Sidebar column mock -->
						<div class="p-4 space-y-4 text-xs font-sans">
							<div class="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Navigasi Utama</div>
							<div class="space-y-1">
								<div class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-2">
									<DatabaseIcon class="w-3.5 h-3.5" />
									<span>Daftar Proyek</span>
								</div>
								<div class="px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white flex items-center gap-2">
									<RadioIcon class="w-3.5 h-3.5" />
									<span>Neon Realtime</span>
								</div>
								<div class="px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white flex items-center gap-2">
									<HardDriveIcon class="w-3.5 h-3.5" />
									<span>S3 Storage</span>
								</div>
								<div class="px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white flex items-center gap-2">
									<ShieldCheckIcon class="w-3.5 h-3.5" />
									<span>Neon Auth & JWKS</span>
								</div>
							</div>
						</div>

						<!-- Main content column mock -->
						<div class="col-span-3 p-5 space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h4 class="text-sm font-bold text-white">Project: e_commerce_app</h4>
									<p class="text-[11px] text-neutral-400">PostgreSQL 16 • 12ms latency • Pooler Active</p>
								</div>
								<span class="text-[10px] font-mono bg-neutral-900 border border-neutral-700 text-emerald-400 px-2 py-0.5 rounded">
									WS Streaming: LIVE
								</span>
							</div>

							<!-- Mock query response table -->
							<div class="bg-neutral-900/70 border border-neutral-800 rounded-lg p-3 font-mono text-[11px] space-y-2">
								<div class="text-neutral-400 text-[10px] uppercase">Live SQL Subscription Stream:</div>
								<div class="text-emerald-400">
									&gt; SELECT id, order_code, total_amount, status FROM orders WHERE status = 'paid';
								</div>
								<div class="text-neutral-300 text-[10px] bg-black/60 p-2.5 rounded border border-neutral-800 space-y-1">
									<p class="text-neutral-500">// Received 3 records via WebSocket</p>
									<p>#101 | ORD-9821 | Rp 450.000 | <span class="text-emerald-400">PAID</span> (just now)</p>
									<p>#102 | ORD-9822 | Rp 1.250.000 | <span class="text-emerald-400">PAID</span> (2s ago)</p>
									<p>#103 | ORD-9823 | Rp 320.000 | <span class="text-emerald-400">PAID</span> (5s ago)</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ============================================== -->
		<!-- METRICS STRIP                                  -->
		<!-- ============================================== -->
		<section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl bg-neutral-900/30 border border-neutral-800/80 backdrop-blur-md">
				<div class="text-center space-y-1">
					<div class="text-2xl sm:text-3xl font-extrabold text-emerald-400">0ms</div>
					<div class="text-xs text-neutral-400">Cold-Start On Demand DB</div>
				</div>
				<div class="text-center space-y-1">
					<div class="text-2xl sm:text-3xl font-extrabold text-cyan-400">WebSocket</div>
					<div class="text-xs text-neutral-400">Realtime SQL Stream</div>
				</div>
				<div class="text-center space-y-1">
					<div class="text-2xl sm:text-3xl font-extrabold text-amber-400">100%</div>
					<div class="text-xs text-neutral-400">Kompatibel AWS S3 API</div>
				</div>
				<div class="text-center space-y-1">
					<div class="text-2xl sm:text-3xl font-extrabold text-purple-400">Edge JWKS</div>
					<div class="text-xs text-neutral-400">Stateless Auth Verification</div>
				</div>
			</div>
		</section>

		<!-- ============================================== -->
		<!-- FEATURE BENTO GRID                             -->
		<!-- ============================================== -->
		<section id="fitur" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
			<div class="text-center space-y-3 max-w-2xl mx-auto">
				<Badge variant="secondary" class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
					Arsitektur & Layanan Cloud
				</Badge>
				<h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
					Didesain untuk Skalabilitas Tanpa Batas
				</h2>
				<p class="text-xs sm:text-sm text-neutral-400">
					Menggabungkan kehebatan komputasi serverless PostgreSQL Neon Cloud dengan utilitas enterprise modern.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{#each features as feat}
					<div class="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 hover:border-neutral-700 transition-all hover:-translate-y-1 group flex flex-col justify-between space-y-4">
						<div class="space-y-3">
							<div class="w-10 h-10 rounded-xl bg-gradient-to-br {feat.gradient} border border-neutral-700/50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
								<feat.icon class="w-5 h-5 text-emerald-400" />
							</div>
							<div class="flex items-center justify-between">
								<h3 class="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
									{feat.title}
								</h3>
								<Badge variant="outline" class="text-[9px] border-neutral-700 text-neutral-400 font-mono">
									{feat.tag}
								</Badge>
							</div>
							<p class="text-xs text-neutral-400 leading-relaxed">
								{feat.desc}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- ============================================== -->
		<!-- INTERACTIVE CODE SHOWCASE (REALTIME / S3)      -->
		<!-- ============================================== -->
		<section id="realtime" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
			<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<Badge variant="secondary" class="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs">
						Live Interactive Demos
					</Badge>
					<h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
						Sederhana di Frontend, Perkasa di Backend
					</h2>
				</div>

				<!-- Tabs switcher -->
				<div class="flex items-center bg-neutral-900/80 p-1 rounded-xl border border-neutral-800 text-xs">
					<button
						type="button"
						onclick={() => (activeDemoTab = 'realtime')}
						class="px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer {activeDemoTab === 'realtime' ? 'bg-emerald-500 text-black font-semibold' : 'text-neutral-400 hover:text-white'}"
					>
						Neon Realtime
					</button>
					<button
						type="button"
						onclick={() => (activeDemoTab = 'storage')}
						class="px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer {activeDemoTab === 'storage' ? 'bg-amber-400 text-black font-semibold' : 'text-neutral-400 hover:text-white'}"
					>
						S3 Storage
					</button>
					<button
						type="button"
						onclick={() => (activeDemoTab = 'gateway')}
						class="px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer {activeDemoTab === 'gateway' ? 'bg-purple-500 text-black font-semibold' : 'text-neutral-400 hover:text-white'}"
					>
						Query API Broker
					</button>
				</div>
			</div>

			<!-- Tab Showcase Content -->
			<div class="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800 backdrop-blur-md">
				{#if activeDemoTab === 'realtime'}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
						<div class="space-y-4">
							<h3 class="text-lg font-bold text-white">Langganan Query SQL Reaktif</h3>
							<p class="text-xs text-neutral-400 leading-relaxed">
								Klien frontend dapat berlangganan kueri SQL apa pun langsung ke endpoint Neon Realtime. Tidak perlu layer polling berulang atau webhook perantara.
							</p>
							<div class="space-y-2 text-xs text-neutral-300 font-mono">
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-emerald-400" />
									<span>WebSocket streaming latency rendah</span>
								</div>
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-emerald-400" />
									<span>Otentikasi aman branch-scoped secret</span>
								</div>
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-emerald-400" />
									<span>Optimistic UI updates langsung siap pakai</span>
								</div>
							</div>
						</div>

						<div class="bg-black/90 p-4 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1 overflow-x-auto">
							<p class="text-neutral-500">// TypeScript / JavaScript SDK</p>
							<p><span class="text-purple-400">import</span> &#123; createRealtimeClient &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">'@neondatabase/realtime'</span>;</p>
							<br />
							<p><span class="text-blue-400">const</span> client = <span class="text-yellow-300">createRealtimeClient</span>(&#123;</p>
							<p class="pl-4">endpoint: <span class="text-emerald-400">'https://ep-small-heart-b3pici55.rt...neon.tech/'</span>,</p>
							<p class="pl-4">secret: process.env.<span class="text-orange-400">NEON_REALTIME_SECRET</span></p>
							<p>&#125;);</p>
							<br />
							<p><span class="text-blue-400">const</span> sub = client.<span class="text-yellow-300">subscribe</span>(&#123;</p>
							<p class="pl-4">sql: <span class="text-emerald-400">'SELECT * FROM products ORDER BY id DESC'</span>,</p>
							<p class="pl-4">onData: (data) =&gt; updateUi(data)</p>
							<p>&#125;);</p>
						</div>
					</div>
				{:else if activeDemoTab === 'storage'}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
						<div class="space-y-4">
							<h3 class="text-lg font-bold text-white">S3-Compatible Cloud Storage</h3>
							<p class="text-xs text-neutral-400 leading-relaxed">
								Simpan aset gambar, dokumen, atau backup database dengan SDK resmi AWS S3. Dapatkan tautan presigned URL dengan masa kedaluwarsa otomatis.
							</p>
							<div class="space-y-2 text-xs text-neutral-300 font-mono">
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-amber-400" />
									<span>Standar industri AWS SDK v3</span>
								</div>
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-amber-400" />
									<span>Aman dengan Presigned URL berkala</span>
								</div>
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-amber-400" />
									<span>Endpoint storage berbasis region terdekat</span>
								</div>
							</div>
						</div>

						<div class="bg-black/90 p-4 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1 overflow-x-auto">
							<p class="text-neutral-500">// s3-client.ts</p>
							<p><span class="text-purple-400">import</span> &#123; S3Client, PutObjectCommand, GetObjectCommand &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">"@aws-sdk/client-s3"</span>;</p>
							<p><span class="text-purple-400">import</span> &#123; getSignedUrl &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">"@aws-sdk/s3-request-presigner"</span>;</p>
							<br />
							<p><span class="text-blue-400">const</span> s3 = <span class="text-purple-400">new</span> <span class="text-yellow-300">S3Client</span>(&#123; forcePathStyle: <span class="text-blue-400">true</span> &#125;);</p>
							<p><span class="text-purple-400">await</span> s3.<span class="text-yellow-300">send</span>(<span class="text-purple-400">new</span> <span class="text-yellow-300">PutObjectCommand</span>(&#123; Bucket: <span class="text-emerald-400">"assets"</span>, Key: <span class="text-emerald-400">"avatar.png"</span>, Body: fileBuffer &#125;));</p>
							<br />
							<p><span class="text-blue-400">const</span> url = <span class="text-purple-400">await</span> <span class="text-yellow-300">getSignedUrl</span>(s3, <span class="text-purple-400">new</span> <span class="text-yellow-300">GetObjectCommand</span>(&#123; Bucket: <span class="text-emerald-400">"assets"</span>, Key: <span class="text-emerald-400">"avatar.png"</span> &#125;), &#123; expiresIn: 3600 &#125;);</p>
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
						<div class="space-y-4">
							<h3 class="text-lg font-bold text-white">Universal Database Gateway API</h3>
							<p class="text-xs text-neutral-400 leading-relaxed">
								Aplikasi eksternal, edge worker, atau microservices dapat berinteraksi ke database mana saja dengan HTTP POST sederhana dan Master Key.
							</p>
							<div class="space-y-2 text-xs text-neutral-300 font-mono">
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-purple-400" />
									<span>Aman dari SQL Injection dengan Parameterized SQL</span>
								</div>
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-purple-400" />
									<span>Dynamic connection pooler otomatis</span>
								</div>
							</div>
						</div>

						<div class="bg-black/90 p-4 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1 overflow-x-auto">
							<p class="text-neutral-500">// HTTP cURL Request</p>
							<p class="text-purple-400">curl -X POST https://your-gateway.com/api/query \</p>
							<p class="pl-4">-H "Authorization: Bearer dev-master-key-12345" \</p>
							<p class="pl-4">-H "x-database-name: project_one" \</p>
							<p class="pl-4">-H "Content-Type: application/json" \</p>
							<p class="pl-4">-d '&#123; "sql": "SELECT * FROM users WHERE active = $1", "params": [true] &#125;'</p>
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- ============================================== -->
		<!-- ARCHITECTURE FLOW                              -->
		<!-- ============================================== -->
		<section id="arsitektur" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
			<div class="text-center space-y-2 max-w-2xl mx-auto">
				<Badge variant="secondary" class="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs">
					Arsitektur Sistem
				</Badge>
				<h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
					Alur Kerja Database Gateway
				</h2>
				<p class="text-xs text-neutral-400">
					Bagaimana setiap komponen berinteraksi secara aman, terdistribusi, dan performan.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
				<div class="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
					<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
						<GlobeIcon class="w-4 h-4" />
					</div>
					<h4 class="text-xs font-bold text-white">1. Klien / Aplikasi</h4>
					<p class="text-[11px] text-neutral-400">Web browser, Mobile app, atau AI Agent mengirim request.</p>
				</div>

				<div class="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
					<div class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
						<LayersIcon class="w-4 h-4" />
					</div>
					<h4 class="text-xs font-bold text-white">2. SvelteKit Gateway</h4>
					<p class="text-[11px] text-neutral-400">Validasi sesi, otorisasi Master Key, dan pool koneksi dinamis.</p>
				</div>

				<div class="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
					<div class="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
						<CpuIcon class="w-4 h-4" />
					</div>
					<h4 class="text-xs font-bold text-white">3. Neon Compute</h4>
					<p class="text-[11px] text-neutral-400">Serverless PostgreSQL mengisolasi data project secara multi-tenant.</p>
				</div>

				<div class="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
					<div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
						<HardDriveIcon class="w-4 h-4" />
					</div>
					<h4 class="text-xs font-bold text-white">4. Cloud Storage & Auth</h4>
					<p class="text-[11px] text-neutral-400">Penyimpanan objek S3 dan verifikasi JWKS remote token.</p>
				</div>
			</div>
		</section>

		<!-- ============================================== -->
		<!-- PORTOFOLIO / DEVELOPER CREDENTIALS             -->
		<!-- ============================================== -->
		<section id="portofolio" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-neutral-900/70 to-purple-950/40 border border-neutral-800 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
				<div class="space-y-4 max-w-xl text-left">
					<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono">
						<span>✨ Portofolio Project Showcase</span>
					</div>
					<h3 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
						Dibangun dengan Standar Enterprise Modern
					</h3>
					<p class="text-xs sm:text-sm text-neutral-300 leading-relaxed">
						Proyek ini dirancang sebagai demonstrasi arsitektur cloud serverless lengkap: 
						<strong>SvelteKit 3</strong>, <strong>Svelte 5 Runes</strong>, <strong>Tailwind CSS 4</strong>, <strong>Neon Serverless PostgreSQL</strong>, <strong>AWS SDK S3</strong>, dan integrasi otentikasi JWT JWKS.
					</p>
					<div class="flex flex-wrap gap-2 pt-2 text-[11px] font-mono text-neutral-300">
						<span class="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700">Svelte 5 Runes</span>
						<span class="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700">SvelteKit 3</span>
						<span class="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700">Neon Cloud</span>
						<span class="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700">AWS S3 SDK</span>
						<span class="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700">Tailwind v4</span>
					</div>
				</div>

				<div class="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
					<a
						href="/"
						class="px-6 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition text-center shadow-lg cursor-pointer"
					>
						Masuk ke Dashboard
					</a>
					<a
						href="/login"
						class="px-6 py-3 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition text-center cursor-pointer"
					>
						Halaman Login
					</a>
				</div>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t border-neutral-800/80 bg-[#07090e] py-10 px-4 sm:px-6 lg:px-8 text-xs text-neutral-500">
		<div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<div class="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-black font-bold text-xs">
					DG
				</div>
				<span class="text-neutral-400 font-semibold">Database Gateway</span>
				<span>• Manajemen Database Cloud Serverless</span>
			</div>
			<div>
				Ditenagai oleh Neon Serverless PostgreSQL & AWS S3 Object Store.
			</div>
		</div>
	</footer>
</div>
