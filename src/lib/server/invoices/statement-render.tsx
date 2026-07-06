import { renderToBuffer } from '@react-pdf/renderer';
import { StatementDoc } from './statement-documents';
import type { StatementModel } from './statement';

export async function renderStatementPdf(model: StatementModel): Promise<Buffer> {
  return renderToBuffer(<StatementDoc model={model} />);
}
