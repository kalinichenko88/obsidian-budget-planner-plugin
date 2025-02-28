<div class="budget-block-wrapper">
	<table class="table" onclick={handleOnTableClick}>
		<TableHead />

		<tbody>
		{#each categories.entries() as [categoryId, categoryName] (categoryId)}
			<CategoryRow categoryId={categoryId} categoryName={categoryName} onChange={handleCategoryChange} />

			{#each rows.get(categoryId) || [] as row (row.id)}
				<TableRow row={row} />
			{/each}

		{/each}
		</tbody>

		<TableFooter />
	</table>
</div>

<script lang="ts">
	import { onMount, setContext } from 'svelte';

	import type { CategoryId, TableStore } from '../../../models';
	import { generateId } from '../../../helpers/generateId';

	import TableHead from './Head/TableHead.svelte';
	import CategoryRow from './CategoryRow/CategoryRow.svelte';
	import TableRow from './Row/Row.svelte';
	import CategoryFooter from './CategoryFooter/CategoryFooter.svelte';
	import TableFooter from './Footer/TableFooter.svelte';
	import AddRow from './AddRow/AddRow.svelte';
	import { STORE_CONTEXT_KEY, STORE_ACTIONS_CONTEXT_KEY } from './constants';
	import { createStoreActions } from './actions';

	type Props = {
		store: TableStore;
		onChange: (data: any) => void;
	}

	const { store }: Props = $props();

	const tableStore = setContext(STORE_CONTEXT_KEY, store);

	const categories = $derived($tableStore.categories);
	const rows = $derived($tableStore.rows);

	const storeActions = createStoreActions(tableStore);
	setContext(STORE_ACTIONS_CONTEXT_KEY, storeActions);

	// onMount(() => {
	// 	store.set({
	// 		selectedRowId: '',
	// 		rows: new Map(rows),
	// 		categories: new Map(categories),
	// 	});
	// });

	// store.set({
	// 	selectedRowId: '',
	// 	categories: props.categories,
	// 	rows: props.rows,
	// });

	// store.subscribe((value) => {
	// 	console.log('subscribe', { value });
	// });

	export const handleCategoryChange = (value: string) => {
		// onChange(value);
	};

	export const handleOnTableClick = () => {
		store.update((data) => {
			data.selectedRowId = '';
			return data;
		});
	}

	// export const handleOnNewRowClick = (categoryId: CategoryId): void => {
	// 	store.update((data) => {
	// 		data.selectedRowId  = '';
	// 		if (data.rows.has(categoryId)) {
	// 			data.rows.get(categoryId)?.push({
	// 				id: generateId(),
	// 				checked: false,
	// 				name: '',
	// 				amount: 0,
	// 				comment: '',
	// 			})
	// 		}
	//
	// 		return data;
	// 	});
	// }
</script>

<style>
	.table {
		width: 100%;
		margin: 0;
		border-collapse: collapse;
	}
</style>
