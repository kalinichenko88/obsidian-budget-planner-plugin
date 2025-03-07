<script lang="ts">
  import { Menu } from 'obsidian';
  import { getContext } from 'svelte';

  import type { CategoryId, TableStateStore } from '../../../../models';
  import type { StoreActions } from '../actions';
  import { STORE_ACTIONS_CONTEXT_KEY, STORE_STATE_CONTEXT_KEY } from '../constants';

  import Editable from '../Editable/Editable.svelte';

  type Props = {
    categoryId: CategoryId;
    categoryName: string;
  };

  const { categoryId, categoryName }: Props = $props();
  let name = $state(categoryName);

  const tableState = getContext<TableStateStore>(STORE_STATE_CONTEXT_KEY);
  const { newCategory, deleteCategory, selectRow, updateCategory, updateEditingCell } =
    getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

  const isEditing = $derived(
    $tableState.editingCell === 'category' && $tableState.editingId === categoryId
  );

  $effect(() => {
    if (name !== categoryName) {
      updateCategory(categoryId, name);
    }
  });

  const menu = new Menu()
    .addItem((item) => {
      item
        .setTitle('New category')
        .setIcon('table-rows-split')
        .onClick(() => newCategory());
    })
    .addSeparator()
    .addItem((item) => {
      item
        .setTitle('Delete category and all rows')
        .setIcon('list-x')
        .onClick(() => deleteCategory(categoryId));
    });

  export const handleOnMenu = (event: MouseEvent): void => {
    event.preventDefault();
    selectRow(null);
    menu.showAtMouseEvent(event);
  };

  export const handleOnClick = (): void => {
    updateEditingCell(categoryId, 'category');
    selectRow(null);
  };
</script>

<tr class="category" oncontextmenu={handleOnMenu}>
  <td colspan={4}>
    <Editable value={name} {isEditing} onClick={handleOnClick} />
  </td>
</tr>

<style>
  .category {
    font-size: 0.9em;
    font-weight: bold;
  }
</style>
