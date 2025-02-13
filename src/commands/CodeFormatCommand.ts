import type { Editor } from 'obsidian';

export class CodeFormatCommand {
	private isProcessing = false;

	private findAllCodeBlocks(editor: Editor): Array<{ start: number; end: number }> {
		const blocks: Array<{ start: number; end: number }> = [];
		const lineCount = editor.lineCount();
		let inBlock = false;
		let currentStart = -1;

		for (let line = 0; line < lineCount; line++) {
			const lineContent = editor.getLine(line);

			if (lineContent.startsWith('```budget')) {
				inBlock = true;
				currentStart = line;
			} else if (lineContent === '```' && inBlock) {
				inBlock = false;
				blocks.push({
					start: currentStart,
					end: line,
				});
			}
		}

		return blocks;
	}

	protected isCategoryRow(line: string): boolean {
		return line.endsWith(':') && !line.startsWith('\t');
	}

	private formatTableContent(content: string): string {
		const rows = content.split('\n');
		let result = '';
		let maxNameLength = 0;
		let maxAmountLength = 0;

		for (const row of rows) {
			if (!row.startsWith('\t')) {
				continue;
			}
			const [name, amount = ''] = row.split('|').map((cell) => cell.trim());
			maxNameLength = Math.max(maxNameLength, name.length);
			maxAmountLength = Math.max(maxAmountLength, amount.length);
		}

		for (const row of rows) {
			if (this.isCategoryRow(row)) {
				result += row.trim() + '\n';
				continue;
			}
			if (!row.startsWith('\t')) {
				continue;
			}

			const [name, amount = '', comment = ''] = row.split('|').map((cell) => cell.trim());

			const paddedName = name.padEnd(maxNameLength, ' ');
			const paddedAmount = amount.padEnd(maxAmountLength, ' ');

			let formattedRow = `\t${paddedName} | ${paddedAmount}`;
			if (comment) {
				formattedRow += ` | ${comment}`;
			}
			result += formattedRow + '\n';
		}

		return result;
	}

	public handle(editor: Editor): void {
		if (this.isProcessing) {
			return;
		}

		try {
			this.isProcessing = true;
			const blocks = this.findAllCodeBlocks(editor);

			blocks.reverse().forEach((block) => {
				const content = editor.getRange({ line: block.start + 1, ch: 0 }, { line: block.end, ch: 0 });
				const formatted = this.formatTableContent(content);

				editor.replaceRange(formatted, { line: block.start + 1, ch: 0 }, { line: block.end, ch: 0 });
			});
		} finally {
			this.isProcessing = false;
		}
	}
}
