import type { Row } from './Row';
import type { Meta } from './Meta';

export type BlockDataValue = { rows: Row[]; meta: Meta };

export type BlockData = Map<string, BlockDataValue>;
