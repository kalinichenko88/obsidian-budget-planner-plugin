<script lang="ts">
  import { getIcon } from 'obsidian';
  import { onMount } from 'svelte';

  type Props = {
    name: string;
  };

  const { name }: Props = $props();

  let iconContainer: HTMLDivElement;

  onMount(() => {
    const icon = getIcon(name);
    if (iconContainer && icon) {
      iconContainer.appendChild(icon);
    }
  });
</script>

<div class="icon" bind:this={iconContainer}></div>

<style>
  .icon {
    height: var(--icon-size);
    width: var(--icon-size);
  }
</style>
