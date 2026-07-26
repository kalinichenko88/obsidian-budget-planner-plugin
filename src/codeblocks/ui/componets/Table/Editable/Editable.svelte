<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import { MarkdownRenderer } from 'obsidian';

  import type { MarkdownContext } from '../../../../models';
  import { MARKDOWN_CONTEXT_KEY } from '../constants';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';

  type Props = {
    value: string | number;
    onChange: (value: string | number) => void;
    onEditingChange: (isEditing: boolean) => void;
    truncate?: boolean;
    markdown?: boolean;
  };

  let { value, onChange, onEditingChange, truncate = false, markdown = false }: Props = $props();

  const md = getContext<MarkdownContext | null>(MARKDOWN_CONTEXT_KEY) ?? null;
  const canRenderMarkdown = $derived(markdown && md !== null);

  const valueType = $derived(typeof value === 'number' ? 'number' : 'text');
  const valueDisplay = $derived(
    valueType === 'number' ? moneyFormatter.format(value as number) : (value as string).trim()
  );

  let editingValue = $state(untrack(() => value));
  let isEditing = $state(false);
  let cancelled = false;
  let startValue: string | number = untrack(() => value);
  let inputElement: HTMLInputElement | null = $state(null);
  let containerEl: HTMLElement | null = $state(null);
  let renderGeneration = 0;

  const handleOnClick = (event: MouseEvent): void => {
    if ((event.target as HTMLElement).closest('a')) {
      return;
    }
    startValue = value;
    isEditing = true;
    onEditingChange(true);
  };

  const handleOnKeyDown = (event: KeyboardEvent): void => {
    if ((event.target as HTMLElement).closest('a')) {
      return;
    }
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

  $effect(() => {
    const el = containerEl;
    const source = valueDisplay;

    if (!el || !md) {
      return;
    }

    // Render detached and swap. MarkdownRenderer.render is async; the token
    // stops a slow render from landing on top of a newer one.
    const token = ++renderGeneration;
    const staging = document.createElement('div');

    void MarkdownRenderer.render(md.app, source, staging, md.sourcePath, md.component)
      .then(() => {
        if (token !== renderGeneration) {
          return;
        }
        el.empty();
        el.append(...staging.childNodes);
      })
      .catch(() => {
        if (token === renderGeneration) {
          el.setText(source);
        }
      });
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
    class:truncating={truncate}
    role="button"
    tabindex="0"
    onclick={handleOnClick}
    onkeydown={handleOnKeyDown}
  >
    {#if canRenderMarkdown}
      <span class="truncated" bind:this={containerEl}></span>
    {:else if truncate}
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
    min-width: 0;
  }

  .text.truncating {
    overflow: hidden;
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

  .text :global(p) {
    margin: 0;
    display: inline;
  }
</style>
