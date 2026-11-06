<script>
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import Toaster from '$lib/components/ui/sonner/sonner.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster position="top-right" duration={2000} richColors />

{@render children()}
