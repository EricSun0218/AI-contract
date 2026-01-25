import React, { useState, useEffect, useRef } from 'react';
import Editor from '@hufe921/canvas-editor';
import docxPlugin from '@hufe921/canvas-editor-plugin-docx';
import { GlassPane, LiquidButton } from './GlassUI';
import { RiskItem, ContractFile } from '../types';

interface EditorViewProps {
  file: ContractFile;
  risks: RiskItem[];
}

// Mock Data Structure for Canvas Editor
const CONTRACT_DATA = [
  {
    value: '设备采购合同',
    size: 24,
    bold: true,
    rowFlex: 'center',
    paragraphSpacingBefore: 20,
    paragraphSpacingAfter: 20
  },
  { value: '\n' },
  { value: '甲方（买方）：', bold: true },
  { value: '未来科技股份有限公司', underline: true },
  { value: '\n' },
  { value: '乙方（卖方）：', bold: true },
  { value: '深蓝精密仪器有限公司', underline: true },
  { value: '\n', paragraphSpacingAfter: 10 },
  { value: '    甲乙双方经友好协商，就甲方向乙方采购设备事宜，达成如下条款，以资共同遵守：\n' },
  { value: '第一条 采购标的', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    1.1 设备名称：高性能量子计算模拟终端。\n' },
  { value: '    1.2 规格型号：QSIM-2024-PRO。\n' },
  { value: '    1.3 数量：10台。\n' },
  { value: '第二条 价格与支付', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    2.1 合同总价款为人民币', },
  { value: '5,000,000.00', bold: true },
  { value: '元（大写：伍佰万元整）。\n' },
  { value: '    2.2 支付方式：银行转账。\n' },
  { value: '    2.3 付款账号：6222 0000 0000 0000', color: '#FF3B30' }, // Risk 1 context
  { value: '。\n' },
  { value: '第三条 违约责任', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    3.1 乙方若延迟交货，每延迟一日，应向甲方支付合同总额', },
  { value: '0.5%', color: '#FF9500', bold: true }, // Risk 2 context
  { value: '的违约金。\n' },
  { value: '第四条 争议解决', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    4.1 本合同履行过程中发生争议，双方应友好协商解决；协商不成的，应向', },
  { value: '有管辖权的人民法院', color: '#007AFF', bold: true }, // Risk 3 context
  { value: '起诉。\n' },
  { value: '第五条 其他', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    5.1 本合同一式两份，双方各执一份。\n' },
  { value: '    （以下无正文）\n' }
];

const EditorView: React.FC<EditorViewProps> = ({ file, risks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<InstanceType<typeof Editor> | null>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docxExporting, setDocxExporting] = useState(false);
  const [docxImporting, setDocxImporting] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let editorInstance: InstanceType<typeof Editor> | null = null;

    const initEditor = () => {
      try {
        editorInstance = new Editor(containerRef.current!, { main: CONTRACT_DATA }, {
          margins: [100, 100, 100, 100],
          watermark: { data: 'SCAi Review', color: 'rgba(200, 200, 200, 0.2)', size: 24 },
          pageNumber: { format: '{pageNo}/{pageCount}' },
        });
        editorInstance.use(docxPlugin);
        editorRef.current = editorInstance;
        setIsReady(true);
      } catch (err) {
        console.error('Failed to load canvas-editor:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load editor');
      }
    };

    initEditor();
    return () => {
      editorInstance?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !editorRef.current?.command?.executeImportDocx) return;
    setDocxImporting(true);
    try {
      const arrayBuffer = await f.arrayBuffer();
      await (editorRef.current.command as { executeImportDocx: (o: { arrayBuffer: ArrayBuffer }) => Promise<void> }).executeImportDocx({ arrayBuffer });
    } catch (err) {
      console.error('导入 Word 失败:', err);
    } finally {
      setDocxImporting(false);
    }
  };

  const handleExportDocx = () => {
    if (!editorRef.current?.command?.executeExportDocx) return;
    setDocxExporting(true);
    try {
      const fileName = file?.name?.replace(/\.(pdf|doc)$/i, '.docx') || '合同.docx';
      (editorRef.current.command as { executeExportDocx: (o: { fileName: string }) => void }).executeExportDocx({ fileName });
    } finally {
      setDocxExporting(false);
    }
  };

  const handleRiskClick = (risk: RiskItem) => {
    if (!editorRef.current) return;
    
    let searchText = "";
    if (risk.id === 'r1') searchText = '6222 0000';
    if (risk.id === 'r2') searchText = '0.5%';
    if (risk.id === 'r3') searchText = '有管辖权的人民法院';

    if (searchText) {
      console.log(`Focusing on risk: ${risk.title} with text: ${searchText}`);
      // In a real implementation, call editorRef.current.command.executeSearch(searchText)
    }
  };

  const handleFixRisk = (risk: RiskItem) => {
    if (!editorRef.current) return;

    // Use executeInsertElementList if available, or fallback
    const command = editorRef.current.command;
    if (command && command.executeInsertElementList) {
      if (risk.id === 'r1') {
        command.executeInsertElementList([
          { value: `\n[已修正: ${risk.suggestion}]`, color: '#34C759', bold: true }
        ]);
      } else {
        command.executeInsertElementList([
          { value: `\n[建议: ${risk.suggestion}]`, color: '#34C759', bold: true }
        ]);
      }
    }
  };

  return (
    <div className="flex h-full w-full relative bg-[#F2F4F7] dark:bg-[#000000]">
      {/* Editor Main Area - Canvas Container */}
      <div className="flex-1 h-full overflow-hidden flex flex-col relative z-0">
        
        {/* Toolbar - Simulated for Canvas Editor */}
        <div className="h-12 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 shrink-0 z-10">
           <div className="flex items-center gap-1">
              <button onClick={() => editorRef.current?.command?.executeUndo()} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded"><span className="material-symbols-outlined text-lg">undo</span></button>
              <button onClick={() => editorRef.current?.command?.executeRedo()} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded"><span className="material-symbols-outlined text-lg">redo</span></button>
           </div>
           <div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-700"></div>
           <div className="flex items-center gap-1">
              <button className="flex items-center gap-1 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-sm font-medium">
                <span>正文</span>
                <span className="material-symbols-outlined text-base">arrow_drop_down</span>
              </button>
              <button className="flex items-center gap-1 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-sm font-medium">
                <span>12</span>
                <span className="material-symbols-outlined text-base">arrow_drop_down</span>
              </button>
           </div>
           <div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-700"></div>
           <div className="flex items-center gap-1">
              <button onClick={() => editorRef.current?.command?.executeBold()} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded"><span className="material-symbols-outlined text-lg font-bold">format_bold</span></button>
              <button onClick={() => editorRef.current?.command?.executeItalic()} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded"><span className="material-symbols-outlined text-lg italic">format_italic</span></button>
              <button onClick={() => editorRef.current?.command?.executeUnderline()} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded"><span className="material-symbols-outlined text-lg underline">format_underlined</span></button>
           </div>
           <div className="flex-1"></div>
           <div className="flex items-center gap-2">
              <input
                ref={docxInputRef}
                type="file"
                accept=".docx,.doc"
                className="hidden"
                onChange={handleImportDocx}
              />
              <button
                onClick={() => docxInputRef.current?.click()}
                disabled={!isReady || docxImporting}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">upload_file</span>
                {docxImporting ? '导入中...' : '导入 Word'}
              </button>
              <button
                onClick={handleExportDocx}
                disabled={!isReady || docxExporting}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">download</span>
                {docxExporting ? '导出中...' : '导出 Word'}
              </button>
           </div>
           <div className="text-xs text-slate-400">
              {loadError ? <span className="text-red-500">{loadError}</span> : (isReady ? '编辑器已就绪' : '初始化中...')}
           </div>
        </div>

        {/* Canvas Scroll Area */}
        <div className="flex-1 overflow-auto bg-[#F2F4F7] dark:bg-[#000000] flex justify-center py-8">
           <div 
             ref={containerRef} 
             className="shadow-2xl"
             style={{ 
               // Ensure container has enough visibility
             }} 
           />
           {loadError && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50">
               <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-xl shadow-xl text-center max-w-md mx-4">
                 <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">组件加载失败</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
                 <p className="text-xs text-slate-400 mt-4">请尝试刷新页面</p>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* AI Risk Analysis Sidebar */}
      <div className="w-96 shrink-0 h-full overflow-y-auto border-l border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 z-20 shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between pb-4 border-b border-white/20 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <span className="material-symbols-outlined text-sm">psychology</span>
            </div>
            <h2 className="font-bold text-slate-800 dark:text-white">AI 风险审查</h2>
          </div>
          <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full border border-red-200 dark:border-red-800/50">
            {risks.length} 项风险
          </span>
        </div>

        <div className="flex-1 space-y-4 min-h-0">
          {risks.map((risk) => (
            <GlassPane 
              key={risk.id}
              onClick={() => handleRiskClick(risk)}
              className={`
                p-4 rounded-[20px] transition-all duration-300 border-l-4
                ${risk.level === 'high' ? 'border-l-red-500' : 
                  risk.level === 'medium' ? 'border-l-orange-500' : 'border-l-blue-500'}
                hover:translate-x-[-4px] cursor-pointer group hover:bg-white/80 dark:hover:bg-white/10
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                  {risk.title}
                </h3>
                <span className={`
                  text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded
                  ${risk.level === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 
                    risk.level === 'medium' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}
                `}>
                  {risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '提示'}
                </span>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                {risk.description}
              </p>

              <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-1 mb-1 opacity-70">
                  <span className="material-symbols-outlined text-[14px]">analytics</span>
                  <span className="text-[10px] font-bold uppercase">AI 分析</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {risk.analysis}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    定位条款
                 </button>
                 <LiquidButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFixRisk(risk);
                    }} 
                    className="!py-1.5 !px-3 !rounded-lg !text-[10px]"
                    variant="primary"
                 >
                    <span className="material-symbols-outlined text-[12px]">auto_fix</span>
                    插入建议
                 </LiquidButton>
              </div>
            </GlassPane>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditorView;
