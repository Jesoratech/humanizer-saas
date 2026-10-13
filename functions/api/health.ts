interface Env {
  MODEL_REQUESTS_ENABLED?: string;
}

export const onRequestGet = async (context: { env: Env }) => {
  const modelEnabled = context.env.MODEL_REQUESTS_ENABLED !== 'false';

  return new Response(
    JSON.stringify({
      status: 'healthy',
      modelEnabled,
      timestamp: new Date().toISOString(),
      version: '1.0.0-beta',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
