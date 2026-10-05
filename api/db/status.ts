export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    success: true,
    status: {
      connected: false,
      message: 'Vercel Serverless Static Mode (Lokal/Client Database Active)',
      tablesCount: 0,
      tables: {},
      lastChecked: new Date().toISOString(),
    },
  });
}
