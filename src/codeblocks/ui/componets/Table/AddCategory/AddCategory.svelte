<tr>
	<td colspan="4" class="add-row" onclick={onClick}>
		<div class="button">
			<Icon name="circle-plus" />
			<span>New Category</span>
		</div>

	</td>
</tr>

<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Props = {
		onClick: () => void;
	}

	const { onClick }: Props = $props();
</script>

<style>
	.add-row {
		cursor: pointer;
		font-size: var(--font-smaller);
	}

	.add-row:hover {
		background-color: var(--table-header-background-hover);
	}

	.button {
		display: flex;
		align-items: center;
		gap: var(--size-2-2);
		color: var(--color-base-40);
	}
</style>
