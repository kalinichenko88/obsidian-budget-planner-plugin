<script lang="ts">
  import { untrack } from 'svelte';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';

  type Props = {
    value: string | number;
    onChange: (value: string | number) => void;
    onEditingChange: (isEditing: boolean) => void;
    truncate?: boolean;
  };

  let { value, onChange, onEditingChange, truncate = false }: Props = $props();

  const valueType = $derived(typeof value === 'number' ? 'number' : 'text');
  const valueDisplay = $derived(
    valueType === 'number' ? moneyFormatter.format(value as number) : (value as string).trim()
  );

  let editingValue = $state(untrack(() => value));
  let isEditing = $state(false);
  let cancelled = false;
  let startValue: string | number = untrack(() => value);
  let inputElement: HTMLInputElement | null = $state(null);

  const handleOnClick = (): void => {
    startValue = value;
    isEditing = true;
    onEditingChange(true);
  };

  const handleOnKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      startValue = value;
      isEditing = true;
      onEditingChange(true);
    }
  };

  const handleOnLeave = (): void => {
    if (cancelled) {
      cancelled = false;
      return;
    }
    isEditing = false;
    onEditingChange(false);
    onChange(editingValue);
  };

  const handleOnWheel = (event: WheelEvent): void => {
    event.preventDefault();
  };

  const handleOnInputKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      isEditing = false;
      onEditingChange(false);
      onChange(editingValue);
    }

    if (event.key === 'Escape') {
      cancelled = true;
      editingValue = startValue;
      onChange(startValue);
      isEditing = false;
      onEditingChange(false);
    }
  };

  $effect(() => {
    if (!isEditing) {
      editingValue = value;
    }
  });

  $effect(() => {
    if (isEditing && inputElement) {
      inputElement.focus();
    }
  });
</script>

{#if isEditing}
  <div class:input-edit={isEditing}>
    <input
      class="input"
      class:input-number={valueType === 'number'}
      bind:this={inputElement}
      bind:value={editingValue}
      type={valueType}
      min={valueType === 'number' ? '0' : undefined}
      step={valueType === 'number' ? '0.10' : undefined}
      onblur={handleOnLeave}
      oninput={() => onChange(editingValue)}
      onwheel={handleOnWheel}
      onkeydown={handleOnInputKeyDown}
    />
  </div>
{:else}
  <div
    class="text"
    class:end={valueType === 'number'}
    role="button"
    tabindex="0"
    onclick={handleOnClick}
    onkeydown={handleOnKeyDown}
  >
    {#if truncate}
      <span class="truncated">{valueDisplay}</span>
    {:else}
      {valueDisplay}
    {/if}
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

  .input-number {
    text-align: right;
  }

  .input-edit {
    border: 1px solid var(--color-blue);
    box-sizing: border-box;
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    padding-left: var(--size-4-2);
    display: flex;
    align-items: center;

    & > .input-number {
      padding-right: var(--size-4-2);
    }
  }

  .text {
    display: flex;
    align-items: center;
    height: var(--input-height);
    cursor: text;
    overflow: hidden;
    min-width: 0;
  }

  .end {
    justify-content: end;
  }

  .truncated {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
</style>
