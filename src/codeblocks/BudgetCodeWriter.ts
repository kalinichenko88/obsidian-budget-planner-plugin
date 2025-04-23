import { type MarkdownSectionInformation, type App, MarkdownView } from 'obsidian';

import { logError, logWarning } from '@/shared/helpers/log';

import type { TableStoreValues, TableRow } from './models';

export class BudgetCodeWriter {
  private values: TableStoreValues;
  private isWriting = false;

  constructor(protected readonly app: App) {
    this.values = {
      categories: new Map(),
      rows: new Map(),
    };
  }

  private isCategoryRow(line: string): boolean {
    return line.endsWith(':') && !line.startsWith('\t');
  }

  private formatRow(row: TableRow): string {
    const checked = row.checked ? '[x]' : '[ ]';
    const name = row.name || '';
    const amount = row.amount?.toString() || '';
    const comment = row.comment || '';

    return `\t${checked} | ${name} | ${amount}${comment ? ` | ${comment}` : ''}\n`;
  }

  private convertToString(values: TableStoreValues): string {
    let result = '';

    values.categories.forEach((categoryName, categoryId) => {
      result += `${categoryName}:\n`;
      const rows = values.rows.get(categoryId) || [];
      rows.forEach((row) => {
        result += this.formatRow(row);
      });
    });

    return result;
  }

  private calculateMaxLengths(rows: string[]): { maxNameLength: number; maxAmountLength: number } {
    let maxNameLength = 0;
    let maxAmountLength = 0;

    for (const row of rows) {
      if (!row.startsWith('\t')) continue;

      const cells = row.split('|').map((cell) => cell.trim());
      const isCheckbox = cells[0] === '[ ]' || cells[0] === '[x]' || cells[0] === '[X]';
      const name = isCheckbox ? cells[1] : cells[0];
      const amount = isCheckbox ? cells[2] || '' : cells[1] || '';

      maxNameLength = Math.max(maxNameLength, name.length);
      maxAmountLength = Math.max(maxAmountLength, amount.length);
    }

    return { maxNameLength, maxAmountLength };
  }

  private parseRowCells(row: string): {
    checkbox: string;
    name: string;
    amount: string;
    comment: string;
  } {
    const cells = row.split('|').map((cell) => cell.trim());
    const isCheckbox = cells[0] === '[ ]' || cells[0] === '[x]' || cells[0] === '[X]';

    return {
      checkbox: isCheckbox ? cells[0] : '[ ]',
      name: isCheckbox ? cells[1] : cells[0],
      amount: isCheckbox ? cells[2] || '' : cells[1] || '',
      comment: isCheckbox ? cells[3] || '' : cells[2] || '',
    };
  }

  private formatCode(code: string): string {
    const rows = code.split('\n').filter((row) => row.trim());
    const { maxNameLength, maxAmountLength } = this.calculateMaxLengths(rows);
    let result = '';

    for (const row of rows) {
      if (this.isCategoryRow(row)) {
        result += row.trim() + '\n';
        continue;
      }

      if (!row.startsWith('\t')) continue;

      const { checkbox, name, amount, comment } = this.parseRowCells(row);

      if (!name || !amount) continue;

      const paddedName = name.padEnd(maxNameLength, ' ');
      const paddedAmount = amount.padEnd(maxAmountLength, ' ');

      let formattedRow = `\t${checkbox} | ${paddedName} | ${paddedAmount}`;
      if (comment) {
        formattedRow += ` | ${comment}`;
      }
      result += formattedRow + '\n';
    }

    return result;
  }

  private async updateFileContent(
    sectionInfo: MarkdownSectionInformation,
    formattedCode: string
  ): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      throw new Error('Active file not found');
    }

    const editor = await this.app.vault.read(activeFile);
    const lines = editor.split('\n');
    const currentSection = lines.slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1);

    if (!currentSection[0]?.includes('```budget')) {
      logWarning('Budget section was modified, canceling update');
      return;
    }

    const codeBlockStart = currentSection[0];
    const codeBlockEnd = currentSection[currentSection.length - 1];

    // Make sure we're only using exactly one closing code block
    const newContent = [codeBlockStart, formattedCode.trim(), '```'].join('\n');

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      throw new Error('Active markdown view not found');
    }

    view.editor.replaceRange(
      newContent,
      { line: sectionInfo.lineStart, ch: 0 },
      { line: sectionInfo.lineEnd, ch: codeBlockEnd.length }
    );
  }

  public async write(
    values: TableStoreValues,
    sectionInfo: MarkdownSectionInformation
  ): Promise<void> {
    if (this.isWriting) {
      logWarning('Writing is already in progress, skipping');

      return;
    }

    const oldCode = this.convertToString(this.values);
    const newCode = this.convertToString(values);
    if (oldCode === newCode) return;

    this.isWriting = true;
    try {
      this.values = values;
      const formattedCode = this.formatCode(newCode);
      await this.updateFileContent(sectionInfo, formattedCode);
    } catch (error) {
      logError('Error writing to file', error);
    } finally {
      this.isWriting = false;
    }
  }
}
