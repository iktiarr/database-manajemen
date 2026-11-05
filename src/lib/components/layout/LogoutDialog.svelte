<script>
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	let { open = $bindable(false) } = $props();
</script>

<AlertDialog.Root bind:open>
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

