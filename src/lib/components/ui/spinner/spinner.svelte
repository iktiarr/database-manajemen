<script>
	let { class: className = '', size = 'md', ...restProps } = $props();

	const sizeClasses = {
		xs: 'w-3 h-3',
		sm: 'w-3.5 h-3.5',
		md: 'w-4 h-4',
		lg: 'w-5 h-5',
		xl: 'w-6 h-6'
	};
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="animate-spin shrink-0 {sizeClasses[size] || sizeClasses.md} {className}"
	{...restProps}
>
	<path d="M21 12a9 9 0 1 1-6.219-8.56" />
</svg>

