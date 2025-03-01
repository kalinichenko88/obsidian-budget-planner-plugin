<script lang="ts">
  import { setContext } from 'svelte';

  import type { CategoryId, TableStore } from '../../../models';
  import { STORE_CONTEXT_KEY, STORE_ACTIONS_CONTEXT_KEY } from './constants';
  import { createStoreActions } from './actions';

  import TableHead from './Head/TableHead.svelte';
  import CategoryRow from './CategoryRow/CategoryRow.svelte';
  import Row from './Row/Row.svelte';
  import CategoryFooter from './CategoryFooter/CategoryFooter.svelte';
  import TableFooter from './Footer/TableFooter.svelte';
  import AddRow from './AddRow/AddRow.svelte';
  import AddCategory from './AddCategory/AddCategory.svelte';

  type Props = {
    store: TableStore;
    onChange: (data: any) => void;
  };

  const { store, onChange }: Props = $props();

  const tableStore = setContext(STORE_CONTEXT_KEY, store);

  const storeActions = createStoreActions(tableStore);
  setContext(STORE_ACTIONS_CONTEXT_KEY, storeActions);

  const { newCategory, selectRow, newRow } = storeActions;

  tableStore.subscribe((value) => {
    console.log({ value });
    // onChange(tableStore);
  });

  export const handleCategoryChange = (value: string) => {
    // onChange(value);
  };

  export const handleAddCategory = () => newCategory();

  export const handleAddRow = (categoryId: CategoryId) => newRow(categoryId);
</script>

<table class="table">
  <TableHead />

  <tbody>
    {#each $tableStore.categories.entries() as [categoryId, categoryName] (categoryId)}
      <CategoryRow {categoryId} {categoryName} onChange={handleCategoryChange} />

      {#each $tableStore.rows.get(categoryId) || [] as row (row.id)}
        <Row {row} />
      {/each}

      <AddRow onClick={() => handleAddRow(categoryId)} />

      <CategoryFooter {categoryId} />
    {/each}
  </tbody>

  <AddCategory onClick={handleAddCategory} />
  <TableFooter />
</table>

<style>
  .table {
    width: 100%;
    margin: 0;
    border-collapse: collapse;
  }
</style>
