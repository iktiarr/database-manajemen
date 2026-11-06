<script>
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import LinkIcon from '@lucide/svelte/icons/link';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let bucketName = $state('assets');
	let uploadKey = $state('uploads/file.txt');
	let fileContent = $state('Hello World from Neon S3 Storage!');
	let isUploading = $state(false);
	let generatedViewUrl = $state('');
	let copiedUrl = $state(false);

	let fileList = $state([]);
	let isLoadingFiles = $state(false);

	onMount(() => {
		loadBucketFiles();
	});

	async function loadBucketFiles() {
		isLoadingFiles = true;
		try {
			const res = await fetch(`/api/storage?bucket=${encodeURIComponent(bucketName)}`);
			const result = await res.json();
			if (res.ok && result.files) {
				fileList = result.files;
			}
		} catch (err) {
			console.error('Failed to list files:', err);
		} finally {
			isLoadingFiles = false;
		}
	}

	async function handleUploadFile(e) {
		e.preventDefault();
		if (!uploadKey.trim()) {
			toast.error('Key Kosong', { description: 'Tentukan jalur/nama file objek S3.' });
			return;
		}

		isUploading = true;
		try {
			const res = await fetch('/api/storage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'upload',
					bucket: bucketName,
					key: uploadKey.trim(),
					content: fileContent
				})
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Gagal mengunggah berkas.');

			generatedViewUrl = result.url || '';
			toast.success('File Terunggah', { description: `Objek "${uploadKey}" berhasil disimpan ke S3.` });
			loadBucketFiles();
		} catch (err) {
			toast.error('Gagal Mengunggah', { description: err.message });
		} finally {
			isUploading = false;
		}
	}

	async function getPresignedUrl(key) {
		try {
			const res = await fetch('/api/storage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'getSignedUrl',
					bucket: bucketName,
					key,
					expiresIn: 3600
				})
			});

			const result = await res.json();
			if (res.ok && result.url) {
				navigator.clipboard.writeText(result.url);
				toast.success('Presigned URL Disalin', { description: 'Tautan berlaku selama 1 jam.' });
			} else {
				throw new Error(result.error || 'Gagal membuat URL.');
			}
		} catch (err) {
			toast.error('Gagal Mendapatkan URL', { description: err.message });
		}
	}

	function copyGeneratedUrl() {
		if (!generatedViewUrl) return;
		navigator.clipboard.writeText(generatedViewUrl);
		copiedUrl = true;
		setTimeout(() => (copiedUrl = false), 2000);
		toast.success('Tersalin', { description: 'Presigned URL disalin ke clipboard.' });
	}

	function formatBytes(bytes) {
		if (!bytes) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="space-y-6 w-full">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold tracking-tight text-neutral-900">S3 Cloud Storage</h1>
				<Badge variant="secondary" class="bg-amber-50 text-amber-800 border-0 text-[10px] font-mono">
					S3-Compatible Object Store
				</Badge>
			</div>
			<p class="text-xs text-neutral-500 mt-1 max-w-2xl">
				Penyimpanan objek kompatibel AWS S3 terintegrasi Neon. Unggah berkas, buat presigned URL yang aman dengan masa berlaku, dan kelola aset aplikasi.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={loadBucketFiles}
				class="text-xs border-neutral-200 hover:bg-neutral-50 cursor-pointer min-w-28 flex items-center justify-center"
			>
				{#if isLoadingFiles}
					<Spinner size="xs" class="text-neutral-700" />
				{:else}
					<RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" />
					<span>Segarkan Aset</span>
				{/if}
			</Button>
		</div>
	</div>

	<!-- Storage Upload & S3 Client Runner -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
		<!-- Upload Form -->
		<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
			<div class="flex items-center justify-between">
				<Card.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
					<UploadIcon class="w-4 h-4 text-neutral-800" />
					<span>Unggah Objek ke Bucket</span>
				</Card.Title>
				<span class="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">Bucket: {bucketName}</span>
			</div>

			<form onsubmit={handleUploadFile} class="space-y-3.5">
				<div>
					<label for="storage-key" class="block text-xs font-medium text-neutral-700 mb-1">
						Key / Jalur Berkas S3
					</label>
					<Input
						id="storage-key"
						type="text"
						bind:value={uploadKey}
						placeholder="uploads/file.txt"
						required
						class="text-xs font-mono border-neutral-200"
					/>
				</div>

				<div>
					<label for="storage-content" class="block text-xs font-medium text-neutral-700 mb-1">
						Konten Teks Berkas
					</label>
					<textarea
						id="storage-content"
						bind:value={fileContent}
						rows="3"
						class="w-full text-xs font-mono border border-neutral-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
						placeholder="Tuliskan konten berkas yang akan disimpan..."
					></textarea>
				</div>

				<div class="flex items-center justify-between pt-1">
					<span class="text-[11px] text-neutral-400">Presigned link berlaku 1 jam (3600 detik)</span>
					<Button
						type="submit"
						disabled={isUploading || !uploadKey.trim()}
						class="text-xs bg-black hover:bg-neutral-800 text-white min-w-28 flex items-center justify-center cursor-pointer"
					>
						{#if isUploading}
							<Spinner size="xs" class="text-white" />
						{:else}
							<span>Unggah ke S3</span>
						{/if}
					</Button>
				</div>
			</form>

			{#if generatedViewUrl}
				<div class="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5 pt-2">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-semibold text-neutral-800">Presigned View URL:</span>
						<button
							type="button"
							onclick={copyGeneratedUrl}
							class="text-[11px] text-neutral-600 hover:text-black flex items-center gap-1 cursor-pointer font-medium"
						>
							{#if copiedUrl}
								<CheckIcon class="w-3 h-3 text-emerald-600" />
								<span>Tersalin!</span>
							{:else}
								<CopyIcon class="w-3 h-3" />
								<span>Salin URL</span>
							{/if}
						</button>
					</div>
					<div class="p-2 bg-neutral-900 text-neutral-200 rounded text-[11px] font-mono break-all max-h-24 overflow-y-auto">
						{generatedViewUrl}
					</div>
				</div>
			{/if}
		</Card.Root>

		<!-- Reference Code Snippet s3-client.ts -->
		<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-3">
			<div class="flex items-center justify-between">
				<Card.Title class="text-sm font-semibold text-neutral-900">Implementasi s3-client.ts</Card.Title>
				<Badge variant="outline" class="text-[10px] font-mono border-neutral-200 text-neutral-600">@aws-sdk/client-s3</Badge>
			</div>

			<div class="bg-neutral-950 text-neutral-200 rounded-lg p-3 font-mono text-[11px] overflow-x-auto border border-neutral-800 space-y-1">
				<p><span class="text-purple-400">import</span> &#123; S3Client, PutObjectCommand, GetObjectCommand &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">"@aws-sdk/client-s3"</span>;</p>
				<p><span class="text-purple-400">import</span> &#123; getSignedUrl &#125; <span class="text-purple-400">from</span> <span class="text-emerald-400">"@aws-sdk/s3-request-presigner"</span>;</p>
				<br />
				<p><span class="text-blue-400">const</span> s3 = <span class="text-purple-400">new</span> <span class="text-yellow-300">S3Client</span>(&#123; forcePathStyle: <span class="text-blue-400">true</span> &#125;);</p>
				<p><span class="text-blue-400">const</span> bucket = <span class="text-emerald-400">"assets"</span>;</p>
				<p><span class="text-blue-400">const</span> key = <span class="text-emerald-400">"uploads/file.txt"</span>;</p>
				<br />
				<p><span class="text-neutral-500">// Upload object</span></p>
				<p><span class="text-purple-400">await</span> s3.<span class="text-yellow-300">send</span>(<span class="text-purple-400">new</span> <span class="text-yellow-300">PutObjectCommand</span>(&#123; Bucket: bucket, Key: key, Body: <span class="text-emerald-400">"Hello World!"</span> &#125;));</p>
				<br />
				<p><span class="text-neutral-500">// Generate presigned download URL</span></p>
				<p><span class="text-blue-400">const</span> url = <span class="text-purple-400">await</span> <span class="text-yellow-300">getSignedUrl</span>(s3, <span class="text-purple-400">new</span> <span class="text-yellow-300">GetObjectCommand</span>(&#123; Bucket: bucket, Key: key &#125;), &#123; expiresIn: 3600 &#125;);</p>
			</div>
		</Card.Root>
	</div>

	<!-- Bucket Object List -->
	<Card.Root class="border border-neutral-200 rounded-xl p-5 shadow-xs bg-white space-y-4">
		<div class="flex items-center justify-between">
			<Card.Title class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
				<HardDriveIcon class="w-4 h-4 text-neutral-700" />
				<span>Daftar Objek di Bucket "{bucketName}"</span>
			</Card.Title>
			<span class="text-xs text-neutral-400">{fileList.length} Objek</span>
		</div>

		{#if fileList.length === 0}
			<div class="py-10 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
				Belum ada objek yang tercatat di bucket. Silakan unggah objek pertama menggunakan form di atas.
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="bg-neutral-50 border-b border-neutral-200">
							<th class="p-3 text-neutral-600 font-medium">Key Objek</th>
							<th class="p-3 text-neutral-600 font-medium">Ukuran</th>
							<th class="p-3 text-neutral-600 font-medium">Waktu Modifikasi</th>
							<th class="p-3 text-right text-neutral-600 font-medium">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each fileList as file}
							<tr class="border-b border-neutral-100 hover:bg-neutral-50/70 transition font-mono">
								<td class="p-3 font-semibold text-neutral-900">{file.key}</td>
								<td class="p-3 text-neutral-500">{formatBytes(file.size)}</td>
								<td class="p-3 text-neutral-400 text-[11px]">
									{file.lastModified ? new Date(file.lastModified).toLocaleString('id-ID') : '-'}
								</td>
								<td class="p-3 text-right">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => getPresignedUrl(file.key)}
										class="text-xs text-neutral-700 hover:text-black gap-1 h-7 px-2 cursor-pointer"
										title="Dapatkan presigned URL"
									>
										<LinkIcon class="w-3 h-3" />
										<span>Ambil URL</span>
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card.Root>
</div>

