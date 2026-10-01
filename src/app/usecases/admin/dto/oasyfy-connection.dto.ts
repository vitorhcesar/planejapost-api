export interface IOasyfyConnectionDiagnosticsDto {
  configured: boolean;
  apiBaseUrl: string;
  publicKeyPreview: string | null;
  publicKeyLength: number;
  secretKeyConfigured: boolean;
  secretKeyLength: number;
}
