import type { App, Component } from 'obsidian';

export type MarkdownContext = {
  app: App;
  sourcePath: string;
  component: Component;
};
