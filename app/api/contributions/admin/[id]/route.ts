import {
  isSameOrigin,
  readBoundedJson,
  validateReview,
} from '@/lib/contribution-core';
import {
  database,
  errorResponse,
  noStoreJson,
  requireModerator,
} from '@/lib/contribution-http';
import { reviewContribution } from '@/lib/contribution-service';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    requireModerator(request);
    if (!isSameOrigin(request))
      return new Response('Origem inválida.', { status: 403 });
    const parsed = validateReview(await readBoundedJson(request));
    if (!parsed.ok)
      return noStoreJson({ error: parsed.error }, { status: 400 });
    const { id } = await context.params;
    const changed = await reviewContribution(
      database(),
      id,
      parsed.value.status,
      parsed.value.note,
    );
    if (!changed)
      return noStoreJson(
        { error: 'Contribuição não encontrada.' },
        { status: 404 },
      );
    return noStoreJson({ ok: true, status: parsed.value.status });
  } catch (error) {
    return errorResponse(error);
  }
}
