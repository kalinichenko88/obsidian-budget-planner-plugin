<script lang="ts">
  import { moneyFormatter } from '../../../helpers/moneyFormatter';

  type Props = {
    value: string | number;
    onChange: (value: string | number) => void;
  };

  let { value, onChange }: Props = $props();

  const valueType = $derived(typeof value === 'number' ? 'number' : 'text');
  const valueDisplay = $derived(
    valueType === 'number' ? moneyFormatter.format(value as number) : (value as string).trim()
  );

  let editingValue = $state(value);
  let isEditing = $state(false);
  let inputElement: HTMLInputElement | null = $state(null);

  const handleOnClick = (): void => {
    isEditing = true;
  };

  const handleOnEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      isEditing = true;
    }
  };

  const handleOnLeave = (): void => {
    isEditing = false;
  };

  $effect(() => {
    if (isEditing && inputElement) {
      inputElement.focus();
    }
  });

  $effect(() => {
    if (editingValue !== value) {
      onChange(editingValue);
    }
  });
</script>

{#if isEditing}
  <input
    class="input"
    bind:this={inputElement}
    bind:value={editingValue}
    type={valueType}
    min={valueType === 'number' ? '0' : undefined}
    step={valueType === 'number' ? '0.10' : undefined}
    onblur={handleOnLeave}
  />
{:else}
  <div
    class="text"
    class:end={valueType === 'number'}
    role="button"
    tabindex="0"
    onclick={handleOnClick}
    onkeydown={handleOnEnter}
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

  .text {
    display: flex;
    align-items: center;
    height: var(--input-height);
    line-height: normal;
  }

  .end {
    justify-content: end;
  }
</style>
