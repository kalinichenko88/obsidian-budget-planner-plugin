<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import { Component, MarkdownRenderer } from 'obsidian';

  import type { MarkdownContext } from '../../../../models';
  import { MARKDOWN_CONTEXT_KEY } from '../constants';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';

  import Icon from '../AddRow/Icon/Icon.svelte';

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

  const startEditing = (): void => {
    startValue = value;
    isEditing = true;
    onEditingChange(true);
  };

  const handleOnKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      startEditing();
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

    // One child per render, released by this effect's cleanup. Registering on
    // the widget-lifetime component instead piles up a render child per edit,
    // each still holding events bound to DOM already emptied out of the cell.
    const child = md.component.addChild(new Component());

    // render can throw synchronously rather than reject — a side-loaded build
    // on an Obsidian older than the manifest floor has no such method at all.
    const degrade = (): void => {
      if (token === renderGeneration) {
        el.setText(source);
      }
    };

    try {
      void MarkdownRenderer.render(md.info.app, source, staging, md.info.file?.path ?? '', child)
        .then(() => {
          if (token !== renderGeneration) {
            return;
          }
          el.empty();
          el.append(...staging.childNodes);
        })
        .catch(degrade);
    } catch {
      degrade();
    }

    // eslint-disable-next-line unicorn/prefer-dom-node-remove -- Obsidian's Component API, not a DOM node
    return () => md.component.removeChild(child);
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
{:else if canRenderMarkdown}
  <!-- Rendered markdown can contain links, so this cell must not be a
       role="button": ARIA makes a button's children presentational and the
       link loses its role. The edit affordance is a sibling of the content
       rather than its container — which also gives back the edit route for a
       comment whose link fills the whole cell. -->
  <div class="text truncating markdown">
    <span class="truncated" bind:this={containerEl}></span>
    <button class="edit" type="button" aria-label="Edit comment" onclick={startEditing}>
      <Icon name="pencil" />
    </button>
  </div>
{:else}
  <div
    class="text"
    class:end={valueType === 'number'}
    class:truncating={truncate}
    role="button"
    tabindex="0"
    onclick={startEditing}
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

  .markdown > .truncated {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
  }

  .edit {
    /* Kept in the layout rather than hidden, so the column does not shift on
       hover and the control stays in the accessibility tree and tab order. */
    opacity: 0;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: var(--icon-size);
    padding: 0;
    border: none;
    box-shadow: none;
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
  }

  .markdown:hover > .edit,
  .edit:focus-visible {
    opacity: 1;
  }

  .edit:hover {
    color: var(--text-normal);
  }

  .text :global(p) {
    margin: 0;
    display: inline;
  }
</style>
