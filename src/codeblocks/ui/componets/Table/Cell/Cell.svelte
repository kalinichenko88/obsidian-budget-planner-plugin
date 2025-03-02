<script lang="ts">
  import { getContext } from 'svelte';

  import type { TableStateStore } from '../../../../models';
  import type { StoreActions } from '../actions';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';
  import { STORE_ACTIONS_CONTEXT_KEY, STORE_STATE_CONTEXT_KEY } from '../constants';

  type Props = {
    value: string | number;
  };

  let { value = $bindable() }: Props = $props();
  const valueType = $derived(typeof value === 'number' ? 'number' : 'text');
  const valueDisplay = $derived(
    valueType === 'number' ? moneyFormatter.format(value as number) : (value as string).trim()
  );

  const tableState = getContext<TableStateStore>(STORE_STATE_CONTEXT_KEY);
  const { selectRow } = getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

  let isEditing = $state(false);
  let inputElement: HTMLInputElement | null = $state(null);

  const selectedRowId = $derived($tableState.selectedRowId);

  $effect(() => {
    if (isEditing && inputElement) {
      inputElement.focus();
      selectRow(null);
    }
  });

  $effect(() => {
    if (selectedRowId !== '') {
      isEditing = false;
    }
  });

  export const handleOnClick = (): void => {
    isEditing = true;
  };

  export const handleOnEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      isEditing = false;
    }
  };
</script>

{#if isEditing}
  <input
    class="input"
    bind:this={inputElement}
    bind:value
    type={valueType}
    min={valueType === 'number' ? '0' : undefined}
    step={valueType === 'number' ? '0.10' : undefined}
  />
{:else}
  <div class="text" role="button" tabindex="0" onclick={handleOnClick} onkeydown={handleOnEnter}>
    {valueDisplay}
  </div>
{/if}

<style>
  .input,
  .input:focus {
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
