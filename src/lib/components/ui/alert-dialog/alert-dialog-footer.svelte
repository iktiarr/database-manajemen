<script>
	import { cn } from "$lib/utils.js";
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert-dialog-footer"
	class={cn(
		"flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>