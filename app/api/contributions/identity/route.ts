import { noStoreJson, userId } from '@/lib/contribution-http';

export function GET(request: Request) {
  const id = userId(request);
  return noStoreJson({ signedIn: Boolean(id), userId: id });
}
