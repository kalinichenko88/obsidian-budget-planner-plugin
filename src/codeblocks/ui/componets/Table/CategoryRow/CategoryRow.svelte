<script lang="ts">
  import { Menu } from 'obsidian';
  import { getContext } from 'svelte';

  import type { CategoryId } from '../../../../models';
  import type { StoreActions } from '../actions';
  import { STORE_ACTIONS_CONTEXT_KEY } from '../constants';

  import Editable from '../Editable/Editable.svelte';

  type Props = {
    categoryId: CategoryId;
    categoryName: string;
    isDeletingEnabled: boolean;
  };

  const { categoryId, categoryName, isDeletingEnabled }: Props = $props();
  let name = $state(categoryName);

  const { newCategory, deleteCategory, selectRow, updateCategory, toggleEditing } =
    getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

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
        .setDisabled(!isDeletingEnabled)
        .onClick(() => deleteCategory(categoryId));
    });

  export const handleOnMenu = (event: MouseEvent): void => {
    event.preventDefault();
    selectRow(null);
    menu.showAtMouseEvent(event);
  };

  export const handleOnChange = (value: string): void => {
    name = value;
  };
</script>

<tr class="category" oncontextmenu={handleOnMenu}>
  <td colspan={4} class="cell">
    <Editable value={name} onChange={handleOnChange} onEditingChange={toggleEditing} />
  </td>
</tr>

<style>
  .category {
    font-size: 0.9em;
    font-weight: bold;

    & > .cell {
      position: relative;
      height: 38.9px;
    }
  }
</style>
