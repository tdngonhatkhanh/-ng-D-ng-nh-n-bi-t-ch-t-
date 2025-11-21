export interface LiquidAnalysis {
  liquidName: string;
  estimatedPH: number;
  confidenceLevel: string;
  reasoning: string;
  properties: string[];
  safetyWarning: string;
  commonUses: string[];
  isLiquidDetected: boolean;
}

export interface AnalysisError {
  message: string;
}

export enum UploadMethod {
  FILE = 'FILE',
  CAMERA = 'CAMERA',
  PASTE = 'PASTE'
}