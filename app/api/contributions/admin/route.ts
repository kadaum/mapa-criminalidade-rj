import {
  CONTRIBUTION_STATUSES,
  type ContributionStatus,
} from '@/lib/contribution-core';
import {
  database,
  errorResponse,
  noStoreJson,
  requireModerator,
} from '@/lib/contribution-http';
import { listContributions } from '@/lib/contribution-service';

export async function GET(request: Request) {
  try {
    requireModerator(request);
    const requested =
      new URL(request.url).searchParams.get('status') ?? 'pending';
    if (!CONTRIBUTION_STATUSES.includes(requested as ContributionStatus))
      return noStoreJson({ error: 'Status inválido.' }, { status: 400 });
    const rows = await listContributions(
      database(),
      requested as ContributionStatus,
    );
    return noStoreJson({ contributions: rows.results });
  } catch (error) {
    return errorResponse(error);
  }
}
