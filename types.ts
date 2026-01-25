/** 原文定位：可定位到文档中的文本片段；replacement 为真实替换文案，缺省时仅标记删除（棕字+黑删除线） */
export interface SourceLocation {
  text: string;
  replacement?: string;
}

/** 风险点：一个条款下的单个风险 */
export interface RiskPoint {
  id: string;
  description: string;
  analysis: string;
  level: 'high' | 'medium' | 'low';
  locations: SourceLocation[];
}

/** 条款风险：按条款分组，含多个风险点与综合性修改意见；缺失条款时 type 为 missing_clause，按钮为智能插入/撤销插入 */
export interface ClauseRisk {
  id: string;
  clauseName: string;
  clauseNumber?: string;
  risks: RiskPoint[];
  revision: string;
  /** 缺失条款时表示需智能插入；否则为接受修订/撤销修订 */
  type?: 'revision' | 'missing_clause';
}

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
