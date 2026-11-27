// Cấu hình từ biến môi trường
export const config = {
  port: Number(process.env.PORT || 3006),
  genealogyUrl: process.env.GENEALOGY_URL || 'http://localhost:3002',
  heritageUrl: process.env.HERITAGE_URL || 'http://localhost:3005',
  reportUrl: process.env.REPORT_URL || 'http://localhost:3007',
  timeoutMs: Number(process.env.INTERNAL_TIMEOUT_MS || 3000),
 
  llm: {
    provider: process.env.LLM_PROVIDER || 'none',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'claude-sonnet-4-6',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.anthropic.com',
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 20000),
  },
};
