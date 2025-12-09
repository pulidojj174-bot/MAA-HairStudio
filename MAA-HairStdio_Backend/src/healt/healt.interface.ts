export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment?: string;
  service?: string;
  version?: string;
  api?: {
    version: string;
    endpoints: string[];
  };
  ready?: boolean;
  alive?: boolean;
  checks?: {
    database?: string;
    memory?: string;
  };
}
