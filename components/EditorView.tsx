import React, { useState, useEffect, useRef } from 'react';
import Editor from '@hufe921/canvas-editor';
import docxPlugin from '@hufe921/canvas-editor-plugin-docx';
import { LiquidButton } from './GlassUI';
import { ContractFile, ClauseRisk } from '../types';
import { exportWithComments, type ExportWithCommentsInput } from '../utils/exportWithComments';

interface EditorViewProps {
  file: ContractFile;
  clauseRisks: ClauseRisk[];
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
  { value: '    2.3 付款账号：6222 0000 0000 0000' },
  { value: '。\n' },
  { value: '第三条 违约责任', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    3.1 乙方若延迟交货，每延迟一日，应向甲方支付合同总额', },
  { value: '0.5%', bold: true },
  { value: '的违约金。\n' },
  { value: '第四条 争议解决', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    4.1 本合同履行过程中发生争议，双方应友好协商解决；协商不成的，应向', },
  { value: '有管辖权的人民法院', bold: true },
  { value: '起诉。\n' },
  { value: '第五条 其他', bold: true, size: 16, paragraphSpacingBefore: 10 },
  { value: '\n' },
  { value: '    5.1 本合同一式两份，双方各执一份。\n' },
  { value: '    （以下无正文）\n' }
];

const SELECTION_POPOVER_GAP = 16;
const SELECTION_POPOVER_H = 40;

// 智能修复：新增内容使用的棕色，仅用于编辑时展示，导出时还原为默认
const INSERTION_COLOR = '#1565C0'; // 蓝色，用于被删原文与新增内容

function cleanElementsForExport<T extends { strikeout?: boolean; color?: string; valueList?: T[]; trList?: { tdList?: { value?: T[] }[] }[] }>(arr: T[]): T[] {
  return arr
    .map((el) => {
      if (el.strikeout) return null;
      const o = { ...el } as T;
      if (o.color === INSERTION_COLOR) delete (o as { color?: string }).color;
      if (Array.isArray(o.valueList)) (o as { valueList: T[] }).valueList = cleanElementsForExport(o.valueList);
      if (Array.isArray(o.trList)) {
        (o as { trList: { tdList?: { value?: T[] }[] }[] }).trList = o.trList!.map((tr) => ({
          ...tr,
          tdList: (tr.tdList || []).map((td) =>
            Array.isArray(td.value) ? { ...td, value: cleanElementsForExport(td.value) } : td
          ),
        }));
      }
      return o;
    })
    .filter((x): x is T => x != null);
}

// 合同摘要：对话初始默认展示（示例数据，实际可由 AI 从当前合同抽取）
const CONTRACT_SUMMARY = {
  transaction: {
    title: '交易模式',
    icon: 'savings',
    iconColor: 'text-amber-500 dark:text-amber-400',
    items: [
      { label: '主要合同类型', value: '软件开发与技术服务协议' },
      { label: '交易背景', value: '甲方向乙方委托开发定制化AI插件系统' },
      { label: '标的', value: '定制化AI插件系统，包含上下文记忆、代码库索引及多模型接入功能' },
      { label: '合同金额', value: '人民币50,000元（大写：伍万元整）' },
      { label: '交付时间', value: '合同签署后30个工作日内交付初步版本' },
      { label: '支付方式', value: '预付款(合同签署后3个工作日内支付30%)，验收款(甲方出具书面验收确认书后7个工作日内支付剩余70%)' },
    ],
  },
  rights: {
    title: '权利义务',
    icon: 'balance',
    iconColor: 'text-violet-500 dark:text-violet-400',
    party: '甲方',
    rights: [
      { title: '使用权获取权', desc: '甲方在付清全部款项后获得AI插件系统的永久、不可撤销的全球使用权。' },
      { title: '验收权', desc: '甲方有权对交付物进行验收，书面验收确认书为验收唯一凭证。' },
      { title: '技术支持请求权', desc: '验收后一年内，甲方可请求乙方提供免费技术支持，包括优化、缺陷修复及新需求适配。' },
    ],
    obligations: [
      { title: '支付款项义务', desc: '按合同约定支付预付款(合同签署后3个工作日内支付30%)及验收款(甲方出具书面验收确认书后7个工作日内支付剩余70%)。' },
    ],
  },
};

const EditorView: React.FC<EditorViewProps> = ({ file, clauseRisks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<InstanceType<typeof Editor> | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docxExporting, setDocxExporting] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<{ top: number; left: number } | null>(null);
  const [aiPanelTab, setAiPanelTab] = useState<'review' | 'chat'>('review');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [appliedRevisions, setAppliedRevisions] = useState<Set<string>>(new Set());
  const [appliedRevisionOpCount, setAppliedRevisionOpCount] = useState<Record<string, number>>({});
  const rangeStyleHandlerRef = useRef<(( payload: unknown ) => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let editorInstance: InstanceType<typeof Editor> | null = null;

    const initEditor = () => {
      try {
        editorInstance = new Editor(containerRef.current!, { main: CONTRACT_DATA }, {
          margins: [100, 100, 100, 100],
          watermark: { data: 'SCAi Review', color: 'rgba(200, 200, 200, 0.2)', size: 24 },
          pageNumber: { format: '{pageNo}/{pageCount}' },
          strikeoutColor: '#000000', // 删除线为黑色，被删原文用棕色
        });
        editorInstance.use(docxPlugin);
        editorRef.current = editorInstance;

        const onRangeStyleChange = () => {
          requestAnimationFrame(() => {
            const cmd = editorInstance?.command;
            if (!cmd?.getRangeContext) return;
            const ctx = cmd.getRangeContext();
            if (!ctx || ctx.isCollapsed || !ctx.rangeRects?.length) {
              setSelectionPopover(null);
              return;
            }
            const rects = ctx.rangeRects;
            let minX = rects[0].x, maxX = rects[0].x + rects[0].width, minY = rects[0].y;
            for (let i = 1; i < rects.length; i++) {
              const q = rects[i];
              minX = Math.min(minX, q.x);
              maxX = Math.max(maxX, q.x + q.width);
              minY = Math.min(minY, q.y);
            }
            const centerX = (minX + maxX) / 2;
            const containerEl = containerRef.current;
            if (!containerEl) return;
            const pageEl = containerEl.querySelector('canvas');
            const base = (pageEl || containerEl).getBoundingClientRect();
            const top = base.top + minY - SELECTION_POPOVER_GAP - SELECTION_POPOVER_H;
            const left = base.left + centerX;
            setSelectionPopover({ top, left });
          });
        };
        rangeStyleHandlerRef.current = onRangeStyleChange;
        editorInstance.eventBus.on('rangeStyleChange', onRangeStyleChange);
      } catch (err) {
        console.error('Failed to load canvas-editor:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load editor');
      }
    };

    initEditor();
    return () => {
      const editor = editorRef.current;
      if (editor?.eventBus?.off && rangeStyleHandlerRef.current) {
        editor.eventBus.off('rangeStyleChange', rangeStyleHandlerRef.current);
      }
      editorInstance?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  const handleExportDocx = async () => {
    const cmd = editorRef.current?.command as {
      getValue?: () => { data: { main?: unknown[]; header?: unknown[]; footer?: unknown[] }; options?: unknown };
    } | undefined;
    if (!cmd?.getValue) return;
    setDocxExporting(true);
    try {
      const fileName = file?.name?.replace(/\.(pdf|doc)$/i, '.docx') || '合同.docx';
      const orig = cmd.getValue?.();
      if (!orig?.data) return;
      const cleanedMain = cleanElementsForExport((orig.data.main || []) as Parameters<typeof cleanElementsForExport>[0]);
      await exportWithComments({
        main: cleanedMain as ExportWithCommentsInput['main'],
        header: (orig.data.header || []) as ExportWithCommentsInput['main'],
        footer: (orig.data.footer || []) as ExportWithCommentsInput['main'],
        clauseRisks,
        appliedRevisions,
        fileName,
      });
    } finally {
      setDocxExporting(false);
    }
  };

  // 定位：只选中该段文字，不调用 executeSearch，避免搜索高亮上色
  // getKeywordRangeList 返回的 startIndex 在选区渲染时会少包含第一个字符，故将 start 左移 1
  const handleLocate = (text: string) => {
    type Range = { startIndex: number; endIndex: number; tableId?: string; startTdIndex?: number; endTdIndex?: number; startTrIndex?: number; endTrIndex?: number };
    const cmd = editorRef.current?.command as { getKeywordRangeList?(t: string): Range[]; executeSetRange?(a: number, b: number, c?: string, d?: number, e?: number, f?: number, g?: number): void } | undefined;
    if (!cmd?.getKeywordRangeList || !cmd?.executeSetRange) return;
    const rangeList = cmd.getKeywordRangeList(text);
    if (!rangeList?.length) return;
    const r = rangeList[0];
    const start = Math.max(0, r.startIndex - 1);
    if (start > r.endIndex) return; // 避免 start > end
    cmd.executeSetRange(start, r.endIndex, r.tableId, r.startTdIndex, r.endTdIndex, r.startTrIndex, r.endTrIndex);
  };

  // 智能修复：真实修改文档。被删原文→棕色+黑删除线；在原文后插入 replacement 作为替换（不追加 revision 建议）。
  // 缺失条款：直接插入新条款全文（棕色）。导出时删除线段落移除、棕色还原，只保留最终结果。
  const doApplyRevision = (clause: ClauseRisk): number => {
    const cmd = editorRef.current?.command as {
      getKeywordRangeList?(t: string): { startIndex: number; endIndex: number; tableId?: string; startTdIndex?: number; endTdIndex?: number; startTrIndex?: number; endTrIndex?: number }[];
      executeSetRange?(a: number, b: number, c?: string, d?: number, e?: number, f?: number, g?: number): void;
      executeColor?: (c: string | null) => void;
      executeStrikeout?: () => void;
      executeInsertElementList?: (list: { value: string; color?: string }[]) => void;
      executeAppendElementList?: (list: { value: string; color?: string }[]) => void;
    } | undefined;
    if (!cmd?.executeStrikeout) return 0;
    let opCount = 0;
    if (clause.type === 'missing_clause') {
      if (cmd.executeAppendElementList) {
        cmd.executeAppendElementList([{ value: `\n\n${clause.revision}`, color: INSERTION_COLOR }]);
        opCount = 1;
      }
      return opCount;
    }
    // (text, replacement) 去重，同一 text 只处理一次
    const pairMap = new Map<string, string | undefined>();
    for (const r of clause.risks)
      for (const loc of r.locations)
        if (loc.text && !pairMap.has(loc.text)) pairMap.set(loc.text, loc.replacement);
    for (const [text, replacement] of pairMap) {
      let list = cmd.getKeywordRangeList?.(text);
      if (!list?.length) continue;
      const r = list[0];
      const start = Math.max(0, r.startIndex - 1); // 与 handleLocate 一致：少选第一个字符时左移
      if (start > r.endIndex) continue;
      cmd.executeSetRange?.(start, r.endIndex, r.tableId, r.startTdIndex, r.endTdIndex, r.startTrIndex, r.endTrIndex);
      cmd.executeColor?.(INSERTION_COLOR); // 被删原文用棕色
      cmd.executeStrikeout?.(); // 删除线（已通过 strikeoutColor 设为黑色）
      opCount += 2;
      if (replacement && cmd.executeInsertElementList) {
        list = cmd.getKeywordRangeList?.(text);
        if (list?.length) {
          const r2 = list[0];
          cmd.executeSetRange?.(r2.endIndex + 1, r2.endIndex + 1);
          cmd.executeInsertElementList([{ value: replacement, color: INSERTION_COLOR }]); // 新增内容用棕色
          opCount += 1;
        }
      }
    }
    return opCount;
  };

  const handleApplyRevision = (clause: ClauseRisk) => {
    const n = doApplyRevision(clause);
    setAppliedRevisions((s) => new Set(s).add(clause.id));
    setAppliedRevisionOpCount((m) => ({ ...m, [clause.id]: n }));
  };

  const handleFixAll = () => {
    const toApply = clauseRisks.filter((c) => !appliedRevisions.has(c.id));
    const counts: Record<string, number> = {};
    toApply.forEach((c) => { counts[c.id] = doApplyRevision(c); });
    setAppliedRevisions((s) => { const n = new Set(s); toApply.forEach((c) => n.add(c.id)); return n; });
    setAppliedRevisionOpCount((m) => ({ ...m, ...counts }));
  };

  const handleRevokeRevision = (clause: ClauseRisk) => {
    const count = appliedRevisionOpCount[clause.id] ?? 1;
    for (let i = 0; i < count; i++) editorRef.current?.command?.executeUndo?.();
    setAppliedRevisions((s) => { const n = new Set(s); n.delete(clause.id); return n; });
    setAppliedRevisionOpCount((m) => { const o = { ...m }; delete o[clause.id]; return o; });
  };

  return (
    <div className="flex h-full w-full relative bg-[#F2F4F7] dark:bg-[#000000]">
      {/* 顶部栏：Word 编辑行 与 AI 审查标题 同一水平线，与左侧 Logo 对齐；无分割线 */}
      <div className="absolute left-0 right-0 top-0 h-14 flex items-center shrink-0 z-10 bg-white dark:bg-[#1a1a1a]">
        {/* Word 编辑工具栏 */}
        <div className="flex-1 h-full flex items-center px-4 gap-4 min-w-0">
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
           <button
             onClick={handleExportDocx}
             disabled={!editorRef.current || docxExporting}
             className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
           >
             <span className="material-symbols-outlined text-base">download</span>
             {docxExporting ? '导出中...' : '导出 Word'}
           </button>
        </div>
        {/* AI 审查顶栏：审查 | 对话 两栏，左侧阴影与编辑行分割，与 Logo、Word 编辑行同一条水平线 */}
        <div className="w-96 shrink-0 h-full flex items-center justify-between px-4 gap-3 shadow-[-4px_0_12px_0_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_0_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shadow-sm border border-white/50 dark:border-white/10">
              <span className="material-symbols-outlined text-sm text-[#007AFF] dark:text-[#0A84FF]">psychology</span>
            </div>
            <div className="flex rounded-lg bg-gray-100 dark:bg-white/10 p-0.5">
              <button
                onClick={() => setAiPanelTab('review')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${aiPanelTab === 'review' ? 'bg-white dark:bg-white/20 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                审查
              </button>
              <button
                onClick={() => setAiPanelTab('chat')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${aiPanelTab === 'chat' ? 'bg-white dark:bg-white/20 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                对话
              </button>
            </div>
          </div>
          {aiPanelTab === 'review' && (
            <button
              onClick={handleFixAll}
              disabled={clauseRisks.every((c) => appliedRevisions.has(c.id))}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
              一键修复
            </button>
          )}
        </div>
      </div>

      {/* Editor Main + AI 列表 */}
      <div className="flex flex-1 h-full overflow-hidden pt-14 relative z-0">
        {/* Editor Main Area - Canvas Container */}
        <div className="flex-1 h-full overflow-hidden flex flex-col relative min-w-0">

        {/* Canvas Scroll Area - 白色背景，文档每页通过阴影区分 */}
        <div ref={scrollAreaRef} className="flex-1 overflow-auto scrollbar-on-hover bg-white dark:bg-[#1a1a1a] flex justify-center py-8 relative">
           <div ref={containerRef} className="ce-word-doc" />
           {/* Word-like selection popover */}
           {selectionPopover && (
             <div
               className="fixed z-[100] flex items-center gap-0.5 px-1 py-1 bg-white dark:bg-[#2C2C2E] rounded-lg shadow-lg border border-gray-200 dark:border-gray-600"
               style={{ top: Math.max(8, selectionPopover.top), left: selectionPopover.left, transform: 'translateX(-50%)' }}
             >
               <button onClick={() => editorRef.current?.command?.executeBold()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded" title="加粗">
                 <span className="material-symbols-outlined text-lg font-bold">format_bold</span>
               </button>
               <button onClick={() => editorRef.current?.command?.executeItalic()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded" title="斜体">
                 <span className="material-symbols-outlined text-lg italic">format_italic</span>
               </button>
               <button onClick={() => editorRef.current?.command?.executeUnderline()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded" title="下划线">
                 <span className="material-symbols-outlined text-lg underline">format_underlined</span>
               </button>
               <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
               <button onClick={() => editorRef.current?.command?.executeHighlight()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded" title="高亮">
                 <span className="material-symbols-outlined text-lg">highlight</span>
               </button>
               <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
               <button onClick={() => {}} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center gap-1" title="添加批注">
                 <span className="material-symbols-outlined text-lg">comment</span>
                 <span className="text-xs">批注</span>
               </button>
             </div>
           )}
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

      {/* AI 右侧栏：纯白背景，左侧阴影与中间区隔；卡片用阴影区分 */}
      <div className="w-96 shrink-0 h-full flex flex-col bg-white dark:bg-[#1a1a1a] shadow-[-4px_0_12px_0_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_0_rgba(0,0,0,0.2)] z-20 overflow-hidden">
        {aiPanelTab === 'review' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* 导航：全部(n) | 高风险(n) | 中风险(n) | 提示(n) */}
            <div className="shrink-0 px-4 pt-4 pb-2">
              <div className="flex rounded-lg bg-gray-100 dark:bg-white/10 p-0.5">
                {(['all', 'high', 'medium', 'low'] as const).map((key) => {
                  const n = key === 'all' ? clauseRisks.reduce((s, c) => s + c.risks.length, 0)
                    : clauseRisks.reduce((s, c) => s + c.risks.filter((r) => r.level === key).length, 0);
                  const label = key === 'all' ? '全部' : key === 'high' ? '高风险' : key === 'medium' ? '中风险' : '提示';
                  return (
                    <button
                      key={key}
                      onClick={() => setReviewFilter(key)}
                      className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        reviewFilter === key
                          ? 'bg-white dark:bg-white/20 text-slate-800 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {label}（{n}）
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-on-hover px-4 pb-4 flex flex-col gap-4 min-h-0">
            {clauseRisks
              .filter((c) => reviewFilter === 'all' || c.risks.some((r) => r.level === reviewFilter))
              .map((clause) => (
              <div
                key={clause.id}
                className="p-4 rounded-[20px] transition-all duration-300 bg-white dark:bg-[#2C2C2E] shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10"
              >
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3">{clause.clauseName}</h3>
                {clause.risks.map((rp) => (
                  <div key={rp.id} className="mb-3 last:mb-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`
                        text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded
                        ${rp.level === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 
                          rp.level === 'medium' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}
                      `}>
                        {rp.level === 'high' ? '高风险' : rp.level === 'medium' ? '中风险' : '提示'}
                      </span>
                      {rp.locations.map((loc, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); handleLocate(loc.text); }}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-white/20 hover:text-[#007AFF] transition-colors truncate max-w-[140px]"
                          title={loc.text}
                        >
                          定位：{loc.text.length > 10 ? loc.text.slice(0, 10) + '…' : loc.text}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">{rp.description}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{rp.analysis}</p>
                  </div>
                ))}
                <div className="bg-gray-50 dark:bg-black/30 rounded-xl p-3 mt-3 mb-3">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {clause.type === 'missing_clause' ? '建议新增条款' : '综合性修改意见'}
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">{clause.revision}</p>
                </div>
                {appliedRevisions.has(clause.id) ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRevokeRevision(clause); }}
                    className="w-full py-2 rounded-xl text-xs font-medium border border-gray-300 dark:border-white/20 text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">undo</span>
                    撤销修复
                  </button>
                ) : (
                  <LiquidButton
                    onClick={(e) => { e.stopPropagation(); handleApplyRevision(clause); }}
                    className="w-full !py-2 !rounded-xl !text-xs flex items-center justify-center gap-1.5"
                    variant="primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                    智能修复
                  </LiquidButton>
                )}
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-on-hover p-4 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">合同摘要</h2>
              {/* 交易模式 */}
              <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10 p-4 shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`material-symbols-outlined text-2xl ${CONTRACT_SUMMARY.transaction.iconColor}`}>{CONTRACT_SUMMARY.transaction.icon}</span>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{CONTRACT_SUMMARY.transaction.title}</h3>
                </div>
                <dl className="space-y-3 text-sm">
                  {CONTRACT_SUMMARY.transaction.items.map(({ label, value }) => (
                    <div key={label}>
                      <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {/* 权利义务 */}
              <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10 p-4 shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`material-symbols-outlined text-2xl ${CONTRACT_SUMMARY.rights.iconColor}`}>{CONTRACT_SUMMARY.rights.icon}</span>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{CONTRACT_SUMMARY.rights.title}</h3>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{CONTRACT_SUMMARY.rights.party}</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">权利</p>
                    <ul className="space-y-2 text-sm">
                      {CONTRACT_SUMMARY.rights.rights.map((r, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{i + 1}. {r.title}：</span>
                          <span className="text-slate-600 dark:text-slate-300">{r.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">义务</p>
                    <ul className="space-y-2 text-sm">
                      {CONTRACT_SUMMARY.rights.obligations.map((r, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{i + 1}. {r.title}：</span>
                          <span className="text-slate-600 dark:text-slate-300">{r.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.15)] shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="与合同对话"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
                <button className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-shadow">
                  <span className="material-symbols-outlined text-xl">send</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default EditorView;
