import type { BlockData } from './models/BlockData';
import type { Row } from './models/Row';

export class CodeParser {
	private readonly rawData: string[];
	private readonly blockData: BlockData = new Map<string, Row[]>();

	constructor(code: string) {
		this.rawData = code.split('\n');
	}

	private addRowToBlockData(key: string, row: Row): void {
		if (!this.blockData.has(key)) {
			this.blockData.set(key, []);

			return;
		}

		const rows: Row[] | undefined = this.blockData.get(key);
		if (!rows) {
			return;
		}
		rows.push(row);

		this.blockData.set(key, rows);
	}

	public parseCode(): BlockData {
		let category = '';
		this.rawData.forEach((line) => {
			const data = [];
			if (!line.startsWith('\t')) {
				category = line.replace(':', '');
				this.blockData.set(category, []);
			} else {
				const [name, amount, comment] = line.split('|').map((cell) => cell.trim());
				const row: Row = { name, amount: Number(amount), comment: comment || '' };
				this.addRowToBlockData(category, row);
			}
		});

		return this.blockData;
	}
}
