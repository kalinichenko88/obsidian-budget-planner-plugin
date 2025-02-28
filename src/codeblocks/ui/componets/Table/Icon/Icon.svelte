<div class="icon" bind:this={iconContainer}></div>

<script lang="ts">
	import { getIcon } from 'obsidian';
	import { onMount } from 'svelte';

	type Props = {
		name: string;
	}

	const { name }: Props = $props();

	let iconContainer: HTMLDivElement;

	onMount(() => {
		const icon = getIcon(name);
		if (iconContainer && icon) {
			iconContainer.appendChild(icon);
		}
	});
</script>

<style>
	.icon {
		max-width: var(--icon-size);
		width: auto;
	}
</style>
