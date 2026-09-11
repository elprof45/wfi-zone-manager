import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
	const limited = rateLimit(getClientKey(request, 'login'), 10, 15 * 60 * 1000);
	if (limited) return limited;
	return handler.POST(request);
}
