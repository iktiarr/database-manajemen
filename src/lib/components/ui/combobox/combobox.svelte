<script>
	import { cn } from "$lib/utils.js";
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	let {
		value = $bindable(''),
		options = [],
		placeholder = 'Pilih opsi...',
		class: className = '',
		disabled = false,
		id = undefined
	} = $props();

	let open = $state(false);

	let selectedOption = $derived(
		options.find((opt) => String(opt.value) === String(value))
	);

	function selectOption(val) {
		value = val;
		open = false;
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') open = false;
	}

	function clickOutside(node) {
		const handleClick = (event) => {
			if (node && !node.contains(event.target)) {
				open = false;
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}
</script>

<div class="relative w-full" use:clickOutside role="none" onkeydown={handleKeydown}>
	<button
		type="button"
		{id}
		{disabled}
		onclick={() => { if (!disabled) open = !open; }}
		class={cn(
			"w-full flex items-center justify-between bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 transition focus:outline-none focus:ring-1 focus:ring-slate-300 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
			open && "ring-1 ring-slate-300 border-slate-300 bg-white",
			className
		)}
	>
		<span class="truncate {selectedOption ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'}">
			{selectedOption ? selectedOption.label : placeholder}
		</span>
		<ChevronDownIcon class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 {open ? 'rotate-180' : ''}" />
	</button>

	{#if open}
		<div
			class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1 text-xs space-y-0.5 max-h-56 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100"
		>
			{#if options.length === 0}
				<div class="p-2 text-center text-slate-400 text-xs">Tidak ada opsi</div>
			{:else}
				{#each options as opt}
					<button
						type="button"
						onclick={() => selectOption(opt.value)}
						class={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer text-xs",
							String(opt.value) === String(value)
								? "bg-emerald-50 text-emerald-900 font-semibold"
								: "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
						)}
					>
						<span class="truncate">{opt.label}</span>
						{#if String(opt.value) === String(value)}
							<CheckIcon class="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>
