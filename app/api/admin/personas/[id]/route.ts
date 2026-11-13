import { personAction } from '@/lib/people-actions';
import { openPeopleRequest, peopleError } from '@/lib/people-route';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const opened = await openPeopleRequest(request, 12_000, 'people-write', 120);
  if ('response' in opened) return opened.response;
  try {
    const { id } = await params;
    return await personAction(opened.actor, id, opened.body);
  } catch { return peopleError('No pudimos guardar el cambio. Inténtalo de nuevo.', 503); }
}
