import type { Component, MarkdownFileInfo } from 'obsidian';

export type MarkdownContext = {
  /** Read `app`/`file` off this per render — a rename mutates TFile.path in
      place and fires no CodeMirror transaction, so nothing here may be
      snapshotted into a string. */
  info: MarkdownFileInfo;
  component: Component;
};
