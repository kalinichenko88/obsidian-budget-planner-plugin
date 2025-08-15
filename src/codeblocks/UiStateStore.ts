import type { UiState } from './models';

export class UiStateStore {
  private readonly store: Map<string, UiState> = new Map();

  public get(key: string): UiState | undefined {
    return this.store.get(key);
  }

  public set(key: string, state: UiState): void {
    this.store.set(key, state);
  }

  public delete(key: string): void {
    this.store.delete(key);
  }

  public dump(): Record<string, UiState> {
    return Object.fromEntries(this.store);
  }
}
