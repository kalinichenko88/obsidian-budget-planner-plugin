<script lang="ts">
  import { moneyFormatter } from '../../../helpers/moneyFormatter';

  type Props = {
    value: string | number;
    onChange: (value: string | number) => void;
    onEditingChange: (isEditing: boolean) => void;
  };

  let { value, onChange, onEditingChange }: Props = $props();

  const valueType = $derived(typeof value === 'number' ? 'number' : 'text');
  const valueDisplay = $derived(
    valueType === 'number' ? moneyFormatter.format(value as number) : (value as string).trim()
  );

  let editingValue = $state(value);
  let isEditing = $state(false);
  let inputElement: HTMLInputElement | null = $state(null);

  const handleOnClick = (): void => {
    isEditing = true;
    onEditingChange(true);
  };

  const handleOnKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      isEditing = true;
      onEditingChange(true);
    }
  };

  const handleOnLeave = (): void => {
    isEditing = false;
    onEditingChange(false);
    onChange(editingValue);
  };

  const handleOnWheel = (event: MouseEvent): void => {
    event.preventDefault();
  };

  const handleOnInputKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      isEditing = false;
      onEditingChange(false);
      onChange(editingValue);
    }

    if (event.key === 'Escape') {
      isEditing = false;
      onEditingChange(false);
      editingValue = value;
    }
  };

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
  }

  .end {
    justify-content: end;
  }
</style>
