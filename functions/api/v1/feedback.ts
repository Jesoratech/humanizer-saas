import { feedbackSchema } from '../../../src/shared/schemas';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  const { request } = context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload.', code: 'BAD_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.errors.map((e) => e.message).join(', ');
    return new Response(
      JSON.stringify({ error: `Validation error: ${errorDetails}`, code: 'VALIDATION_ERROR' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Accepted
  return new Response(
    JSON.stringify({ success: true, message: 'Thank you for your feedback!' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
