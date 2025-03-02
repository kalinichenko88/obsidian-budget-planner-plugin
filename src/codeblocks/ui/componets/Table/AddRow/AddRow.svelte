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

  .button {
    display: flex;
    align-items: center;
    gap: var(--size-2-2);
    color: var(--text-faint);
    margin: var(--size-2-2) 0 var(--size-2-2) 0.55rem;
  }

  .button > span {
    font-size: var(--font-smaller);
    line-height: normal;
  }
</style>
