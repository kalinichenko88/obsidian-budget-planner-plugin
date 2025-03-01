<script lang="ts">
  import Icon from '../Icon/Icon.svelte';

  type Props = {
    text: string;
    onClick: () => void;
  };

  const { text, onClick }: Props = $props();
</script>

<tr class="add-row">
  <td colspan="4" onclick={onClick}>
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

  .add-row td {
    font-size: var(--font-smaller);
  }

  .button {
    display: flex;
    align-items: center;
    gap: var(--size-2-2);
    color: var(--color-base-40);
    margin-left: 0.55rem;
  }
</style>
