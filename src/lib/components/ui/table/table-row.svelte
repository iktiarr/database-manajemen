<script>
	import { cn } from "$lib/utils.js";
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn("hover:bg-slate-50/60 border-b border-slate-100/80 transition-colors", className)}
	{...restProps}
>
	{@render children?.()}
</tr>