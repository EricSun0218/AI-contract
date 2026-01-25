
export interface RiskItem {
  id: string;
  title: string;
  description: string;
  analysis: string;
  suggestion: string;
  level: 'high' | 'medium' | 'low';
}

export interface ContractFile {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'processing' | 'draft';
  type: 'doc' | 'pdf';
  url?: string; // Added url for document viewer
}

export type ViewState = 'upload' | 'editor';
