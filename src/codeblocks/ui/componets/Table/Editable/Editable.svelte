<script lang="ts">
  import { moneyFormatter } from '../../../helpers/moneyFormatter';

  type Props = {
    value: string | number;
    isEditing: boolean;
    onClick: () => void;
  };

  let { value = $bindable(), isEditing = $bindable(false), onClick }: Props = $props();

  const valueType = $derived(typeof value === 'number' ? 'number' : 'text');
  const valueDisplay = $derived(
    valueType === 'number' ? moneyFormatter.format(value as number) : (value as string).trim()
  );

  let inputElement: HTMLInputElement | null = $state(null);

  const handleOnClick = (): void => {
    onClick();
  };

  const handleOnEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      onClick();
    }
  };

  $effect(() => {
    if (isEditing && inputElement) {
      inputElement.focus();
    }
  });
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
