import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDoc } from './documents';
import type { InvoiceModel } from './types';

export async function renderInvoicePdf(model: InvoiceModel): Promise<Buffer> {
  return renderToBuffer(<InvoiceDoc model={model} />);
}
