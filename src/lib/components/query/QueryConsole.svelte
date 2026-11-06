<script>
	import { Combobox } from '$lib/components/ui/combobox/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';

	let {
		databases = [],
		masterKey = '',
		selectedDb = $bindable('neondb')
	} = $props();

	let sqlQuery = $state('SELECT datname, encoding FROM pg_database LIMIT 5;');
	let sqlParams = $state('[]');
	let isExecuting = $state(false);
	let queryResult = $state(null);
	let queryDuration = $state(null);
	let codeTab = $state('curl'); // 'curl' | 'fetch'
	let copiedCode = $state(false);

	$effect(() => {
		if (databases.length > 0 && selectedDb === 'neondb' && !databases.some((d) => d.name === 'neondb')) {
			selectedDb = databases[0].name;
		}
	});

	async function handleExecuteQuery() {
		queryResult = null;
		queryDuration = null;

		if (!masterKey.trim()) {
			queryResult = { error: 'Master API Key belum diatur. Harap masukkan Master API Key di menu API Key & Settings.' };
			toast.error('API Key Diperlukan', { description: 'Atur Master API Key terlebih dahulu' });
			return;
		}

		if (!sqlQuery.trim()) {
			queryResult = { error: 'Query SQL tidak boleh kosong.' };
			toast.error('Query Kosong', { description: 'Masukkan perintah SQL yang valid' });
			return;
		}

		let parsedParams = [];
		if (sqlParams.trim()) {
			try {
				parsedParams = JSON.parse(sqlParams);
				if (!Array.isArray(parsedParams)) {
					queryResult = { error: 'Parameter harus berformat JSON Array, contoh: ["val1", 2]' };
					toast.error('Format Salah', { description: 'Parameter harus berupa array JSON' });
					return;
				}
			} catch {
				queryResult = { error: 'Format JSON Parameter tidak valid.' };
				toast.error('Format Salah', { description: 'Sintaks JSON parameter tidak valid' });
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
				toast.error('Eksekusi Gagal', { description: dataRes.error || 'Query tidak berhasil dijalankan' });
			} else {
				queryResult = {
					rows: dataRes.rows || [],
					rowCount: dataRes.rowCount ?? 0
				};
				toast.success('Query Berhasil', { description: `${dataRes.rowCount ?? 0} baris dalam ${queryDuration}ms` });
			}
		} catch (err) {
			queryResult = { error: err.message || 'Gagal terhubung ke API gateway' };
			toast.error('Koneksi Gagal', { description: err.message || 'Tidak dapat terhubung ke server' });
		} finally {
			isExecuting = false;
		}
	}

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
</script>

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
					class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-5 shadow-xs flex items-center justify-center min-w-[130px] min-h-[36px]"
				>
					{#if isExecuting}
						<Spinner size="sm" class="text-white" />
					{:else}
						Jalankan Query
					{/if}
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

