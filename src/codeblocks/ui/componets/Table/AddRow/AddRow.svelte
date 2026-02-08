<script lang="ts">
  import Icon from './Icon/Icon.svelte';

  type Props = {
    text: string;
    onClick: () => void;
    disabled?: boolean;
  };

  const { text, onClick, disabled = false }: Props = $props();
</script>

<tr class="add-row" class:disabled>
  <td
    colspan="4"
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-label={text}
    onclick={() => (disabled ? undefined : onClick())}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!disabled) onClick();
      }
    }}
  >
    <div class="button">
      <Icon name="circle-plus" />
      <span>{text}</span>
    </div>
  </td>
</tr>

<style>
  .add-row {
    cursor: pointer;
  }

  .add-row:hover {
    background-color: var(--table-header-background-hover);
  }

  .add-row.disabled,
  .add-row.disabled:hover {
    pointer-events: none;
    opacity: 0.6;
    cursor: not-allowed;
    background: inherit;
  }

  .button {
    display: flex;
    align-items: center;
    gap: var(--size-2-2);
    color: var(--text-faint);
    margin: var(--size-2-2) 0 var(--size-2-2) 0.55rem;
    padding: var(--size-2-2) var(--size-4-2) var(--size-2-2) 0;
  }

  .button > span {
    font-size: var(--font-smaller);
    line-height: normal;
  }
</style>
