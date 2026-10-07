import { database, errorResponse, noStoreJson } from '@/lib/contribution-http';
import { contributionStatus } from '@/lib/contribution-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ protocol: string }> | { protocol: string } },
) {
  try {
    const { protocol } = await context.params;
    const record = await contributionStatus(database(), protocol);
    if (!record)
      return noStoreJson(
        { error: 'Protocolo não encontrado.' },
        { status: 404 },
      );
    return noStoreJson({ status: record.status });
  } catch (error) {
    return errorResponse(error);
  }
}
