import type { BlockData, BlockDataValue } from './models/BlockData';
import type { Row } from './models/Row';
import type { Meta } from './models/Meta';

export class CodeParser {
	private readonly rawData: string[];
	private readonly blockData: BlockData = new Map<string, BlockDataValue>();

	constructor(code: string) {
		this.rawData = code.split('\n');
	}

	private summarizeBlockData(key: string): void {
		const dataValue: BlockDataValue | undefined = this.blockData.get(key);
		if (!dataValue) {
			return;
		}

		const sum: Meta = { sum: dataValue.rows.reduce((acc, row) => acc + row.amount, 0) };

		this.blockData.set(key, { ...dataValue, meta: sum });
	}

	private addRowToBlockData(key: string, row: Row): void {
		const dataValue: BlockDataValue | undefined = this.blockData.get(key);
		if (!dataValue) {
			return;
		}
		dataValue.rows.push(row);

		this.blockData.set(key, dataValue);
		this.summarizeBlockData(key);
	}

	public parseCode(): BlockData {
		let category = '';
		this.rawData.forEach((line) => {
			if (!line.startsWith('\t')) {
				category = line.replace(':', '');
				this.blockData.set(category, { rows: [], meta: { sum: 0 } });
			} else {
				const [name, amount, comment] = line.split('|').map((cell) => cell.trim());
				const row: Row = { name, amount: Number(amount), comment: comment || '' };
				this.addRowToBlockData(category, row);
			}
		});

		return this.blockData;
	}
}
