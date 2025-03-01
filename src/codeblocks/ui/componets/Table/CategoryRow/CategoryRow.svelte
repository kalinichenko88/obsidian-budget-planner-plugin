<tr class="category" oncontextmenu={handleOnMenu}>
	<td colspan={4}>
		<Cell value={categoryName} onChange={handleOnChange} />
	</td>
</tr>

<script lang="ts">
	import { Menu } from 'obsidian';

	import type { CategoryId } from '../../../../models';
	import type { StoreActions } from '../actions';
	import Cell from '../Cell/Cell.svelte';
	import { getContext } from 'svelte';
	import { STORE_ACTIONS_CONTEXT_KEY } from '../constants';

	type Props = {
		categoryId: CategoryId;
		categoryName: string;
		onChange: (value: string) => void;
	}

	let { categoryId, categoryName, onChange }: Props = $props();

	const { newCategory, deleteCategory } = getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

	const menu = new Menu();
	menu
		.addItem((item) => {
			item.setTitle('New category');
			item.setIcon('table-rows-split');
			item.onClick(() => newCategory())
		})
		.addSeparator()
		.addItem((item) => {
			item.setTitle('Delete category and all rows');
			item.setIcon('list-x');
			item.onClick(() => deleteCategory(categoryId));
		})

	export function handleOnChange(value: string) {
		onChange(value);
	}

	export const handleOnMenu = (event: MouseEvent) => {
		event.preventDefault();
		menu.showAtMouseEvent(event);
	}
</script>

<style>
	.category {
		font-size: 0.9em;
		font-weight: bold;
	}
</style>
