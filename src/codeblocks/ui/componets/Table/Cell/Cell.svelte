
{#if isEditing}
	<input
		class="input"
		bind:this={inputElement}
		value={value}
		type={type}
		min={type === 'number' ? '0' : undefined}
		step={type === 'number' ? '0.10' : undefined}
		oninput={handleOnChange}
		onkeydown={handleOnEnter}
	/>
{:else}
	<div
		class="text"
		role="button"
		tabindex="0"
		onclick={handleOnClick}
		onkeydown={handleOnEnter}
	>
		{value}
	</div>
{/if}

<script lang="ts">
	import { getContext } from 'svelte';
	import { debounce } from 'obsidian';

	import type { TableStore } from '../../../../models';
	import { STORE_CONTEXT_KEY } from '../constants';

	type Props = {
		value: string;
		type?: 'text' | 'number';
		onChange: (value: string) => void;
	}

	const { value, type = 'text', onChange }: Props = $props();

	const store = getContext<TableStore>(STORE_CONTEXT_KEY);

	let isEditing = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);

	const selectedRowId = $derived($store.selectedRowId);

	$effect(() => {
		if (isEditing && inputElement) {
			inputElement.focus();
		}
	});

	$effect(() => {
		if (selectedRowId !== '') {
			isEditing = false;
		}
	});

	export const handleOnChange = debounce((event: Event) => {
		onChange((event.target as HTMLInputElement).innerText);
	}, 300);

	export const handleOnClick = (): void => {
		isEditing = true;
	};

	export const handleOnEnter = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			isEditing = false;
		}
	};
</script>

<style>
	.input, .input:focus {
		margin: 0;
		padding: 0;
		border: none;
		outline: none;
		background: transparent;
		font: inherit;
		color: inherit;
		box-shadow: none;
		width: 100%;
	}

	.text {
		display: flex;
		align-items: center;
		height: var(--input-height);
		line-height: normal;
	}
</style>
