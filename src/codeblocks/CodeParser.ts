import type { BlockData, BlockDataValue } from './models/BlockData';
import type { Row } from './models/Row';
import type { Meta } from './models/Meta';

export class CodeParser {
	private readonly blockData: BlockData = new Map<string, BlockDataValue>();
	protected readonly rawData: string[];

	constructor(protected readonly source: string) {
		this.rawData = source.split('\n');
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
			this.blockData.set(key, { rows: [row], meta: { sum: row.amount } });
			return;
		}
		dataValue.rows.push(row);

		this.blockData.set(key, dataValue);
		this.summarizeBlockData(key);
	}

	private parseSumFromRow(amount: string): number {
		const result = parseFloat(amount.replace(/[^0-9.]/g, ''));
		if (Number.isNaN(result)) {
			return 0;
		}

		return result;
	}

	protected isCategoryRow(line: string): boolean {
		return line.endsWith(':') && !line.startsWith('\t');
	}

	public parseCode(): BlockData {
		let category = '';

		for (const line of this.rawData) {
			if (this.isCategoryRow(line)) {
				category = line.replace(/:$/, '');
				this.blockData.set(category, { rows: [], meta: { sum: 0 } });
				continue;
			}

			const [name, amount = '', comment = ''] = line.split('|').map((cell) => cell.trim());
			const row: Row = { name, amount: this.parseSumFromRow(amount), comment: comment || '' };
			this.addRowToBlockData(category, row);
		}

		return this.blockData;
	}
}
