import React, { useState, useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Editor from '@hufe921/canvas-editor';
import docxPlugin from '@hufe921/canvas-editor-plugin-docx';
import { LiquidButton } from './GlassUI';
import { ContractFile, ClauseRisk } from '../types';
import { exportWithComments, type ExportWithCommentsInput } from '../utils/exportWithComments';
import { exportWithOfficialPluginAndAddComments } from '../utils/exportWithOfficialPlugin';

interface EditorViewProps {
  file: ContractFile;
  uploadedFile?: File;
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

// 智能修复：修改内容使用蓝色标记，导出时还原为默认颜色
const INSERTION_COLOR = '#1565C0';

// 批注序号正则：匹配 【N】 格式的序号
const COMMENT_INDICATOR_REGEX = /【\d+】/g;

// 导出时清除蓝色标记和批注序号，恢复默认颜色
function cleanElementsForExport<T extends { value?: string; color?: string; valueList?: T[]; trList?: { tdList?: { value?: T[] }[] }[] }>(arr: T[]): T[] {
  return arr
    .map((el) => {
      const o = { ...el } as T;
      // 清除蓝色标记
      if (o.color === INSERTION_COLOR) delete (o as { color?: string }).color;
      // 移除批注序号（如 【1】、【2】）
      if (typeof (o as { value?: string }).value === 'string') {
        (o as { value: string }).value = (o as { value: string }).value.replace(COMMENT_INDICATOR_REGEX, '');
      }
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
    // 过滤掉值为空的元素（序号被完全移除后）
    .filter((el) => {
      const val = (el as { value?: string }).value;
      // 保留非字符串值的元素，或者值不为空的元素
      return val === undefined || val !== '';
    });
}

// 合同摘要：对话初始默认展示（针对设备采购合同的内容）
const CONTRACT_SUMMARY = {
  transaction: {
    title: '交易模式',
    icon: 'savings',
    iconColor: 'text-amber-500 dark:text-amber-400',
    items: [
      { label: '主要合同类型', value: '设备采购合同' },
      { label: '交易背景', value: '甲方向乙方采购高性能量子计算模拟终端' },
      { label: '标的', value: 'QSIM-2024-PRO 高性能量子计算模拟终端，数量：10台' },
      { label: '合同金额', value: '人民币5,000,000.00元（大写：伍佰万元整）' },
      { label: '交付时间', value: '合同约定的交货时间' },
      { label: '支付方式', value: '银行转账' },
    ],
  },
  rights: {
    title: '权利义务',
    icon: 'balance',
    iconColor: 'text-violet-500 dark:text-violet-400',
    party: '甲方',
    rights: [
      { title: '验收权', desc: '甲方有权对乙方交付的设备进行验收，确保符合合同约定的规格和质量要求。' },
      { title: '索赔权', desc: '若设备存在质量问题或乙方延迟交货，甲方有权提出索赔。' },
      { title: '技术支持请求权', desc: '甲方有权要求乙方提供设备的安装、调试、培训和售后技术支持。' },
    ],
    obligations: [
      { title: '支付款项义务', desc: '按合同约定支付设备款项。' },
      { title: '验收义务', desc: '在设备交付后，甲方应及时进行验收。' },
    ],
  },
};

// 手动批注类型
interface ManualComment {
  id: string;
  content: string;
  selectedText: string;
  createdAt: Date;
  index: number; // 批注序号
}

const EditorView: React.FC<EditorViewProps> = ({ file, uploadedFile, clauseRisks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<InstanceType<typeof Editor> | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const aiPanelScrollRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docxExporting, setDocxExporting] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<{ top: number; left: number } | null>(null);
  const [aiPanelTab, setAiPanelTab] = useState<'review' | 'chat'>('review');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'high' | 'medium' | 'manual'>('all');
  const [appliedRevisions, setAppliedRevisions] = useState<Set<string>>(new Set());
  const [appliedRevisionOpCount, setAppliedRevisionOpCount] = useState<Record<string, number>>({});
  const rangeStyleHandlerRef = useRef<((payload: unknown) => void) | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  
  // Loading 状态
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [documentProgress, setDocumentProgress] = useState(0);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [aiProgress, setAiProgress] = useState(0);

  // 手动批注列表
  const [manualComments, setManualComments] = useState<ManualComment[]>([]);
  // 防止重复添加序号的标记
  const isAddingCommentRef = useRef(false);

  // 批注输入状态
  const [commentInput, setCommentInput] = useState<{
    visible: boolean;
    selectedText: string;
    content: string;
    position: { top: number; left: number };
  }>({ visible: false, selectedText: '', content: '', position: { top: 0, left: 0 } });
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // 原文弹窗状态
  const [originalTextModal, setOriginalTextModal] = useState<{
    visible: boolean;
    text: string;
    position?: { top: number; left: number; width?: number };
  }>({ visible: false, text: '' });

  // 创建全局风险序号映射：{riskId: globalIndex}
  const riskIndexMap = useRef<Map<string, number>>(new Map());

  // New: Map to store risk data by group ID
  interface RiskData {
    id: string;
    index: number;
    description: string;
    suggestion: string;
    status: 'fixed' | 'unfixed';
    original: string;
    isManual?: boolean; // 标记是否为手动批注
  }
  const riskMapRef = useRef<Map<string, RiskData>>(new Map());
  
  // 计算下一个手动批注序号（从风险批注序号之后开始）
  const getNextManualCommentIndex = (currentManualComments: ManualComment[]): number => {
    const totalRiskCount = clauseRisks.reduce((sum, clause) => sum + clause.risks.length, 0);
    return totalRiskCount + currentManualComments.length + 1;
  };

  // 不再添加序号标记到编辑器
  const [clauseLocateIndex, setClauseLocateIndex] = useState<Record<string, number>>({});
  const clauseLocateTargetsRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    let index = 1;
    const map = new Map<string, number>();
    clauseRisks.forEach(clause => {
      clause.risks.forEach(risk => {
        map.set(risk.id, index++);
      });
    });
    riskIndexMap.current = map;
  }, [clauseRisks]);

  // Recompute locate targets per clause whenever risks or revisions change
  useEffect(() => {
    const cmd = editorRef.current?.command as any;
    const targets: Record<string, string[]> = {};
    for (const clause of clauseRisks) {
      const fixed = appliedRevisions.has(clause.id);
      if (clause.type === 'missing_clause') {
        targets[clause.id] = fixed ? [clause.revision] : ['合同'];
      } else {
        const set = new Set<string>();
        for (const r of clause.risks) {
          for (const loc of r.locations) {
            const q = fixed ? (loc.replacement || loc.text) : loc.text;
            if (q) set.add(q);
          }
        }
        targets[clause.id] = Array.from(set);
      }
    }
    clauseLocateTargetsRef.current = targets;
    setClauseLocateIndex((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const id of Object.keys(targets)) {
        const total = targets[id].length || 0;
        const cur = prev[id] ?? 1;
        next[id] = total ? Math.min(cur, total) : 0;
      }
      return next;
    });
  }, [clauseRisks, appliedRevisions]);

  // 编辑器初始化 - 只在组件挂载时执行一次
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    let editorInstance: InstanceType<typeof Editor> | null = null;

    const initEditor = async () => {
      try {
        // 使用空文档初始化，等待真实文档上传
        editorInstance = new Editor(containerRef.current!, { main: [] }, {
          margins: [100, 120, 100, 100],
          watermark: { data: 'SCAi Review', color: 'rgba(200, 200, 200, 0.2)', size: 24 },
          pageNumber: { format: '{pageNo}/{pageCount}' },
          comment: {
            userName: '智能助手',
          },
        } as any);
        editorInstance.use(docxPlugin);
        editorRef.current = editorInstance;

        const onRangeStyleChange = () => {
          const cmd = editorInstance?.command as any;
          if (!cmd) return;

          // Selection Popover Logic - 原生批注由 canvas-editor 自动处理
          requestAnimationFrame(() => {
            if (!cmd?.getRangeContext) return;
            const ctx = cmd.getRangeContext();
            if (!ctx || ctx.isCollapsed || !ctx.rangeRects?.length) {
              setSelectionPopover(null);
              return;
            }
            
            // 检测是否选中了批注序号标记（【N】），选中时跳转到对应卡片
            const rangeText = cmd.getRangeText?.() || '';
            const commentMatch = rangeText.match(/【(\d+)】/);
            
            if (commentMatch) {
              // 通过序号查找对应的风险或手动批注
              const index = parseInt(commentMatch[1], 10);
              const riskData = riskMapRef.current.get(index.toString());
              if (riskData) {
                // 延迟跳转，避免频繁触发
                setTimeout(() => {
                  scrollToRisk(riskData.id, riskData.isManual);
                }, 100);
              }
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
        setEditorReady(true);

        // 如果已有上传文件，立即加载
        if (uploadedFile) {
          try {
            console.log('Loading uploaded file:', uploadedFile);
            const arrayBuffer = await uploadedFile.arrayBuffer();
            console.log('File read as ArrayBuffer');

            const result = await editorInstance.command.executeImportDocx({
              arrayBuffer: arrayBuffer
            });
            console.log('Document imported:', result);
          } catch (error) {
            console.error('Error loading uploaded file:', error);
            setLoadError('无法解析文档，请尝试其他格式');
          }
        }
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
      setEditorReady(false);
    };
  }, []); // 只在组件挂载时初始化一次

  // 文件上传处理 - 当 uploadedFile 变化且编辑器准备好时加载文件
  useEffect(() => {
    if (!uploadedFile || !editorReady || !editorRef.current) return;

    const loadFile = async () => {
      try {
        console.log('Loading uploaded file:', uploadedFile);
        const arrayBuffer = await uploadedFile.arrayBuffer();
        console.log('File read as ArrayBuffer');

        const result = await editorRef.current!.command.executeImportDocx({
          arrayBuffer: arrayBuffer
        });
        console.log('Document imported:', result);
      } catch (error) {
        console.error('Error loading uploaded file:', error);
        setLoadError('无法解析文档，请尝试其他格式');
      }
    };

    loadFile();
  }, [uploadedFile, editorReady]);

  const handleExportDocx = async () => {
    setDocxExporting(true);

    const cmd = editorRef.current?.command as {
      getValue?: () => { data: { main?: unknown[]; header?: unknown[]; footer?: unknown[] }; options?: unknown };
      executeExportDocx?: (options: { fileName: string }) => Promise<void>;
    } | undefined;

    if (!cmd?.getValue) {
      console.error('Command not available');
      setDocxExporting(false);
      return;
    }

    try {
      const fileName = file?.name?.replace(/\.(pdf|doc)$/i, '.docx') || '合同.docx';

      // 使用官方插件的导出逻辑，但获取 blob 后发送到后端添加批注
      const orig = cmd.getValue?.() as any;
      if (!orig?.data) {
        setDocxExporting(false);
        return;
      }

      // 清理蓝色标记，恢复默认颜色
      const cleanedMain = cleanElementsForExport((orig.data.main || []) as Parameters<typeof cleanElementsForExport>[0]);
      const cleanedHeader = cleanElementsForExport((orig.data.header || []) as Parameters<typeof cleanElementsForExport>[0]);
      const cleanedFooter = cleanElementsForExport((orig.data.footer || []) as Parameters<typeof cleanElementsForExport>[0]);

      console.log('Exporting using official plugin API');
      
      // 将手动批注转换为格式（包含 selectedText 作为 location）
      const manualCommentsForExport = manualComments.map(comment => ({
        id: comment.id,
        content: comment.content,
        userName: '用户',
        time: comment.createdAt.toISOString(),
        selectedText: comment.selectedText, // 保留选中文本，用于后端定位
      }));

      // 使用官方插件导出，获取 blob，然后发送到后端添加批注
      await exportWithOfficialPluginAndAddComments({
        main: cleanedMain,
        header: cleanedHeader,
        footer: cleanedFooter,
        clauseRisks,
        appliedRevisions,
        fileName,
        comments: [...(orig.comments || []), ...manualCommentsForExport],
      }, editorRef.current);

      console.log('Export completed');
    } catch (error) {
      console.error('Export failed:', error);
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

  // 文档区域 loading：3秒后完成
  useEffect(() => {
    if (!uploadedFile) {
      setIsDocumentLoading(false);
      return;
    }
    
    setIsDocumentLoading(true);
    setDocumentProgress(0);
    
    // 模拟 3 秒加载进度
    const interval = setInterval(() => {
      setDocumentProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDocumentLoading(false);
          }, 200);
          return 100;
        }
        return prev + 3.33; // 每 100ms 增加约 3.33%，3 秒完成
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [uploadedFile]);

  // AI 区域 loading：4秒后完成
  useEffect(() => {
    if (!uploadedFile) {
      setIsAiLoading(false);
      return;
    }
    
    setIsAiLoading(true);
    setAiProgress(0);
    
    // 模拟 4 秒加载进度
    const interval = setInterval(() => {
      setAiProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsAiLoading(false);
          }, 200);
          return 100;
        }
        return prev + 2.5; // 每 100ms 增加 2.5%，4 秒完成
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [uploadedFile]);

  // 更新风险映射（不再添加序号标记）
  useEffect(() => {
    if (!editorReady || !clauseRisks.length) return;

    // 计算风险序号
    let localGlobalIndex = 1;
    const localRiskIndexMap = new Map<string, number>();
    clauseRisks.forEach((clause) => {
      clause.risks.forEach((risk) => {
        localRiskIndexMap.set(risk.id, localGlobalIndex++);
      });
    });

    // 更新风险映射
    riskMapRef.current.clear();
    clauseRisks.forEach((clause) => {
      clause.risks.forEach((risk) => {
        const riskIndex = localRiskIndexMap.get(risk.id) || 0;
        riskMapRef.current.set(riskIndex.toString(), {
          id: risk.id,
          index: riskIndex,
          description: risk.description,
          suggestion: clause.revision,
          status: appliedRevisions.has(clause.id) ? 'fixed' : 'unfixed',
          original: ''
        });
      });
    });
  }, [editorReady, clauseRisks, appliedRevisions]);

  // 滚动到指定风险卡片或手动批注卡片
  const scrollToRisk = (riskId: string, isManual: boolean = false) => {
    const cardId = isManual ? `manual-comment-${riskId}` : `risk-card-${riskId}`;
    const riskCard = document.getElementById(cardId);
    if (riskCard) {
      // 使用右侧面板的滚动容器
      const scrollContainer = aiPanelScrollRef.current || document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const cardRect = riskCard.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop + (cardRect.top - containerRect.top) - (containerRect.height / 2) + (cardRect.height / 2);
        scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
      } else {
        riskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // 点击外部关闭批注输入框
  useEffect(() => {
    if (!commentInput.visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-comment-input]')) {
        setCommentInput(prev => ({ ...prev, visible: false, content: '' }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commentInput.visible]);

  // 智能修复：直接替换文本，新内容用蓝色标记
  const doApplyRevision = (clause: ClauseRisk): number => {
    const cmd = editorRef.current?.command as any;
    if (!cmd?.executeInsertElementList) {
      console.warn(`[doApplyRevision] Editor command not available`);
      return 0;
    }
    let opCount = 0;

    if (clause.type === 'missing_clause') {
      if (cmd.executeAppendElementList) {
        cmd.executeAppendElementList([{ value: `\n\n${clause.revision}`, color: INSERTION_COLOR }]);
        opCount = 1;
      }
      return opCount;
    }

    // (text, replacement) 去重，同一 text 只处理一次
    const pairMap = new Map<string, string>();
    for (const r of clause.risks)
      for (const loc of r.locations)
        if (loc.text && !pairMap.has(loc.text)) {
           pairMap.set(loc.text, loc.replacement || '');
        }

    for (const [text, replacement] of pairMap) {
      if (!replacement) continue;

      // 直接查找原文并替换（不再有【N】序号）
      const list = cmd.getKeywordRangeList?.(text);
      if (!list?.length) {
        console.log(`[doApplyRevision] Text not found: "${text.substring(0, 30)}..."`);
        continue;
      }
      const r = list[0];
      const start = Math.max(0, r.startIndex - 1);
      if (start > r.endIndex) continue;

      cmd.executeSetRange(start, r.endIndex, r.tableId, r.startTdIndex, r.endTdIndex, r.startTrIndex, r.endTrIndex);
      cmd.executeInsertElementList([{ value: replacement, color: INSERTION_COLOR }]);
      opCount++;
    }

    return opCount;
  };

  const handleApplyRevision = (clause: ClauseRisk) => {
    if (!editorReady || !editorRef.current) {
      console.warn(`[handleApplyRevision] Editor not ready`);
      return;
    }
    
    const n = doApplyRevision(clause);
    console.log(`[handleApplyRevision] Clause ${clause.id} (${clause.clauseName}): ${n} operations`);
    console.log(`[handleApplyRevision] Current opCount before update:`, appliedRevisionOpCount);
    
    // 使用 setTimeout 确保操作完成后再更新状态
    setTimeout(() => {
      setAppliedRevisions((s) => new Set(s).add(clause.id));
      setAppliedRevisionOpCount((m) => {
        const newMap = { ...m, [clause.id]: n };
        console.log(`[handleApplyRevision] Updated opCount map:`, newMap);
        return newMap;
      });
    }, 100);
  };

  const handleFixAll = () => {
    if (!editorReady || !editorRef.current) {
      console.warn(`[handleFixAll] Editor not ready`);
      return;
    }
    
    const toApply = clauseRisks.filter((c) => !appliedRevisions.has(c.id));
    const counts: Record<string, number> = {};
    
    console.log(`[handleFixAll] Starting fix for ${toApply.length} clauses, editor ready: ${editorReady}`);
    
    // 逐个执行修复，确保每个操作都完成
    toApply.forEach((c) => { 
      const count = doApplyRevision(c);
      console.log(`[handleFixAll] Clause ${c.id} (${c.clauseName}): ${count} operations, type: ${c.type}`);
      
      // 对于缺失条款，确保至少记录 1 次操作
      // 对于替换操作，如果返回 0（找不到文本），不记录（避免无法撤销）
      if (c.type === 'missing_clause') {
        counts[c.id] = count > 0 ? count : 1;
      } else {
        counts[c.id] = count > 0 ? count : 0;
      }
    });
    
    // 只记录实际执行了操作的条款
    const appliedClauses = toApply.filter((c) => {
      const count = counts[c.id];
      return count !== undefined && count > 0;
    });
    
    console.log(`[handleFixAll] Applied ${appliedClauses.length} clauses, counts:`, counts);
    console.log(`[handleFixAll] Current opCount before update:`, appliedRevisionOpCount);
    
    // 使用 setTimeout 确保操作完成后再更新状态
    setTimeout(() => {
      setAppliedRevisions((s) => { 
        const n = new Set(s); 
        appliedClauses.forEach((c) => n.add(c.id)); 
        return n; 
      });
      setAppliedRevisionOpCount((m) => {
        const newMap = { ...m };
        appliedClauses.forEach((c) => {
          newMap[c.id] = counts[c.id];
        });
        console.log(`[handleFixAll] Updated opCount map:`, newMap);
        return newMap;
      });
    }, 100);
  };

  const handleRevokeRevision = (clause: ClauseRisk) => {
    console.log(`[handleRevokeRevision] Starting revoke for clause: ${clause.clauseName}, id: ${clause.id}`);
    console.log(`[handleRevokeRevision] Current opCount map:`, appliedRevisionOpCount);
    
    const count = appliedRevisionOpCount[clause.id];
    if (count === undefined || count === 0) {
      console.warn(`[handleRevokeRevision] No operation count found for clause: ${clause.clauseName}, attempting single undo`);
      // 如果没有记录操作次数，尝试执行一次撤销
      const result = editorRef.current?.command?.executeUndo?.();
      console.log(`[handleRevokeRevision] Single undo result:`, result);
    } else {
      console.log(`[handleRevokeRevision] Clause: ${clause.clauseName}, Operation count: ${count}, Type: ${clause.type}`);
      
      // 对于缺失条款（executeAppendElementList），通常只需要 1 次撤销
      // 对于替换操作（executeInsertElementList），每次替换可能产生 2 次 undo（删除原文本 + 插入新文本）
      let actualUndoCount: number;
      if (clause.type === 'missing_clause') {
        // 缺失条款：executeAppendElementList 通常只产生 1 次 undo
        actualUndoCount = count;
      } else {
        // 替换操作：每次 executeInsertElementList 可能产生 2 次 undo
        actualUndoCount = count * 2;
      }
      
      console.log(`[handleRevokeRevision] Executing ${actualUndoCount} undos`);
      for (let i = 0; i < actualUndoCount; i++) {
        const result = editorRef.current?.command?.executeUndo?.();
        console.log(`[handleRevokeRevision] Undo ${i + 1}/${actualUndoCount} executed, result:`, result);
        // 如果撤销失败（返回 false），停止继续撤销
        if (result === false) {
          console.warn(`[handleRevokeRevision] Undo ${i + 1} failed, stopping`);
          break;
        }
        // 添加小延迟，确保每次撤销操作完成
        if (i < actualUndoCount - 1) {
          // 不在最后一次添加延迟
        }
      }
    }
    
    // 更新状态
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
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
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
              className="shrink-0 relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white shadow-lg hover:shadow-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
            >
              {/* 斜着移动的高光效果 */}
              <div className="absolute inset-0 shine-highlight"></div>
              <span className="relative z-10 material-symbols-outlined text-[14px]">auto_fix_high</span>
              <span className="relative z-10">一键修复</span>
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
          {/* Document Loading */}
          {isDocumentLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#1a1a1a] z-50">
              <div className="flex flex-col items-center justify-center">
                <div className="w-48 h-48">
                  <DotLottieReact
                    src="https://lottie.host/83357735-8017-462c-96aa-ec09b387a4da/37XiVpR5In.lottie"
                    loop
                    autoplay
                  />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 -mt-12">文档解析中</p>
                <p className="text-base font-semibold text-[#007AFF] dark:text-[#0A84FF] -mt-2">
                  {Math.round(documentProgress)}%
                </p>
              </div>
            </div>
          )}
          <div className={`w-full flex justify-center transition-opacity duration-500 ${isDocumentLoading ? 'opacity-0' : 'opacity-100'}`}>
            <div ref={containerRef} className="ce-word-doc" />
          </div>

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
                <button
                  onClick={() => {
                    const cmd = editorRef.current?.command as any;
                    const rangeText = cmd?.getRangeText?.() || '';
                    // 显示批注输入框
                    setCommentInput({
                      visible: true,
                      selectedText: rangeText || '（未选中文本）',
                      content: '',
                      position: { top: selectionPopover?.top || 0, left: selectionPopover?.left || 0 },
                    });
                    setSelectionPopover(null);
                    // 延迟聚焦输入框
                    setTimeout(() => commentInputRef.current?.focus(), 100);
                  }}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center gap-1"
                  title="添加批注"
                >
                  <span className="material-symbols-outlined text-lg">comment</span>
                  <span className="text-xs">批注</span>
                </button>
              </div>
            )}

            {/* 批注输入框和错误提示 */}
            {commentInput.visible && (
              <div
                data-comment-input
                className="fixed z-[101] w-72 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden"
                style={{ top: Math.max(60, commentInput.position.top), left: commentInput.position.left, transform: 'translateX(-50%)' }}
              >
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#007AFF] dark:text-[#0A84FF] text-base">edit_note</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">添加批注</span>
                  </div>
                  <button
                    onClick={() => setCommentInput(prev => ({ ...prev, visible: false, content: '' }))}
                    className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                {/* 选中文本预览 */}
                <div className="px-3 py-2 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">标注文本</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {commentInput.selectedText.length > 60 ? commentInput.selectedText.slice(0, 60) + '...' : commentInput.selectedText}
                  </p>
                </div>
                {/* 输入区域 */}
                <div className="p-3">
                  <textarea
                    ref={commentInputRef}
                    value={commentInput.content}
                    onChange={(e) => setCommentInput(prev => ({ ...prev, content: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        if (commentInput.content.trim()) {
                          // 添加手动批注到状态（canvas-editor 不支持 executeSetComment API）
                          setManualComments(prev => {
                            const commentIndex = getNextManualCommentIndex(prev);
                            const newComment: ManualComment = {
                              id: `manual-${Date.now()}`,
                              content: commentInput.content,
                              selectedText: commentInput.selectedText,
                              createdAt: new Date(),
                              index: commentIndex,
                            };
                            const updated = [...prev, newComment];
                            // 不再添加序号标记
                            // 更新风险映射，用于点击序号时跳转
                            riskMapRef.current.set(commentIndex.toString(), {
                              id: newComment.id,
                              index: commentIndex,
                              description: newComment.content,
                              suggestion: '',
                              status: 'unfixed',
                              original: newComment.selectedText,
                              isManual: true,
                            });
                            // 延迟跳转到新添加的批注卡片
                            setTimeout(() => {
                              // 切换到审查标签页
                              setAiPanelTab('review');
                              // 切换到手动批注筛选
                              setReviewFilter('manual');
                              // 跳转到对应的卡片
                              scrollToRisk(newComment.id, true);
                            }, 100);
                            return updated;
                          });
                          setCommentInput({ visible: false, selectedText: '', content: '', position: { top: 0, left: 0 } });
                        }
                      } else if (e.key === 'Escape') {
                        setCommentInput(prev => ({ ...prev, visible: false, content: '' }));
                      }
                    }}
                    placeholder="输入批注内容..."
                    className="w-full h-20 px-3 py-2 text-sm rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">⌘/Ctrl + Enter 提交</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCommentInput(prev => ({ ...prev, visible: false, content: '' }))}
                        className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          if (commentInput.content.trim()) {
                            // 添加手动批注到状态（canvas-editor 不支持 executeSetComment API）
                            setManualComments(prev => {
                              const commentIndex = getNextManualCommentIndex(prev);
                              const newComment: ManualComment = {
                                id: `manual-${Date.now()}`,
                                content: commentInput.content,
                                selectedText: commentInput.selectedText,
                                createdAt: new Date(),
                                index: commentIndex,
                              };
                              const updated = [...prev, newComment];
                              // 不再添加序号标记
                              // 更新风险映射，用于点击序号时跳转
                              riskMapRef.current.set(commentIndex.toString(), {
                                id: newComment.id,
                                index: commentIndex,
                                description: newComment.content,
                                suggestion: '',
                                status: 'unfixed',
                                original: newComment.selectedText,
                                isManual: true,
                              });
                              // 延迟跳转到新添加的批注卡片
                              setTimeout(() => {
                                // 切换到审查标签页
                                setAiPanelTab('review');
                                // 切换到手动批注筛选
                                setReviewFilter('manual');
                                // 跳转到对应的卡片
                                scrollToRisk(newComment.id, true);
                              }, 100);
                              return updated;
                            });
                            setCommentInput({ visible: false, selectedText: '', content: '', position: { top: 0, left: 0 } });
                          }
                        }}
                        disabled={!commentInput.content.trim()}
                        className="px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
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
        <div className="w-96 shrink-0 h-full flex flex-col bg-white dark:bg-[#1a1a1a] shadow-[-4px_0_12px_0_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_0_rgba(0,0,0,0.2)] z-20 overflow-hidden relative">
          {/* AI Loading */}
          {isAiLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#1a1a1a] z-50">
              <div className="flex flex-col items-center justify-center">
                <div className="w-48 h-48">
                  <DotLottieReact
                    src="https://lottie.host/83357735-8017-462c-96aa-ec09b387a4da/37XiVpR5In.lottie"
                    loop
                    autoplay
                  />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 -mt-12">AI 审查中</p>
                <p className="text-base font-semibold text-[#007AFF] dark:text-[#0A84FF] -mt-2">
                  {Math.round(aiProgress)}%
                </p>
              </div>
            </div>
          )}
          {!isAiLoading && (
            <div className={`w-full h-full flex flex-col transition-opacity duration-500 ${isAiLoading ? 'opacity-0' : 'opacity-100'}`}>
          {aiPanelTab === 'review' ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* 导航：全部(n) | 高风险(n) | 中风险(n) | 手动(n) */}
              <div className="shrink-0 px-4 pt-4 pb-2">
                <div className="flex rounded-lg bg-gray-100 dark:bg-white/10 p-0.5">
                  {(['all', 'high', 'medium', 'manual'] as const).map((key) => {
                    const n = key === 'all'
                      ? clauseRisks.reduce((s, c) => s + c.risks.filter((r) => r.level === 'high' || r.level === 'medium').length, 0) + manualComments.length
                      : key === 'manual'
                        ? manualComments.length
                        : clauseRisks.reduce((s, c) => s + c.risks.filter((r) => r.level === key).length, 0);
                    const label = key === 'all' ? '全部' : key === 'high' ? '高风险' : key === 'medium' ? '中风险' : '手动';
                    return (
                      <button
                        key={key}
                        onClick={() => setReviewFilter(key)}
                        className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${reviewFilter === key
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
              <div ref={aiPanelScrollRef} className="flex-1 overflow-y-auto scrollbar-on-hover px-4 pb-4 flex flex-col gap-4 min-h-0" style={{ willChange: 'scroll-position' }}>
                {/* AI 风险卡片 - 只显示 high 和 medium 级别 */}
                {reviewFilter !== 'manual' && clauseRisks
                  .filter((c) => c.risks.some((r) => r.level === 'high' || r.level === 'medium'))
                  .filter((c) => reviewFilter === 'all' || c.risks.some((r) => r.level === reviewFilter))
                  .map((clause) => (
                    <div
                      key={clause.id}
                      className="p-4 rounded-[20px] bg-white dark:bg-[#2C2C2E] shadow-md dark:shadow-lg border border-gray-100 dark:border-white/10"
                    >
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3">{clause.clauseName}</h3>
                      {clause.risks
                        .filter((rp) => rp.level === 'high' || rp.level === 'medium')
                        .map((rp) => (
                        <div key={rp.id} id={`risk-card-${rp.id}`} className="mb-3 last:mb-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`
                        text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded
                        ${rp.level === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' :
                                'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'}
                      `}>
                              {rp.level === 'high' ? '高风险' : '中风险'}
                            </span>
                            {rp.locations.map((loc, i) => (
                              <button
                                key={i}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const button = e.currentTarget as HTMLElement;
                                  const rect = button.getBoundingClientRect();
                                  const buttonWidth = rect.width;
                                  const modalHeight = Math.min(200, window.innerHeight * 0.4);
                                  
                                  // 计算位置，确保不超出屏幕
                                  let top = rect.bottom + 8;
                                  let left = rect.left;
                                  
                                  // 如果下方空间不足，显示在上方
                                  if (top + modalHeight > window.innerHeight - 16) {
                                    top = rect.top - modalHeight - 8;
                                  }
                                  
                                  // 如果右侧超出，调整到左侧
                                  if (left + buttonWidth > window.innerWidth - 16) {
                                    left = window.innerWidth - buttonWidth - 16;
                                  }
                                  
                                  // 确保不超出左边界
                                  if (left < 16) {
                                    left = 16;
                                  }
                                  
                                  // 确保不超出上边界
                                  if (top < 16) {
                                    top = 16;
                                  }
                                  
                                  setOriginalTextModal({ 
                                    visible: true, 
                                    text: loc.text,
                                    position: { top, left, width: buttonWidth }
                                  }); 
                                }}
                                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-white/20 hover:text-[#007AFF] transition-colors truncate max-w-[140px]"
                                title={loc.text}
                              >
                                原文：{loc.text.length > 10 ? loc.text.slice(0, 10) + '…' : loc.text}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-700/30 text-[#007AFF] dark:text-[#0A84FF] text-[10px] font-bold mr-1.5 shadow-sm">
                              {riskIndexMap.current.get(rp.id) || 0}
                            </span>
                            {rp.description}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{rp.analysis}</p>
                        </div>
                      ))}
                      <div className="bg-gray-50 dark:bg-black/30 rounded-xl p-3 mt-3 mb-3">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {clause.type === 'missing_clause' ? '建议新增条款' : '综合性修改意见'}
                        </p>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">{clause.revision}</p>
                      </div>
                      <div className="flex items-center gap-2 justify-between">
                        {/* 条款定位 控件 - 缺失条款未修复时不显示 */}
                        {!(clause.type === 'missing_clause' && !appliedRevisions.has(clause.id)) && (
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/10">
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">条款定位</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const id = clause.id;
                              const list = clauseLocateTargetsRef.current[id] || [];
                              const total = list.length;
                              if (!total) return;
                              const cur = clauseLocateIndex[id] ?? 1;
                              const next = cur <= 1 ? total : cur - 1;
                              setClauseLocateIndex((m) => ({ ...m, [id]: next }));
                              const q = list[next - 1];
                              handleLocate(q);
                            }}
                            className="px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                            title="上一处"
                          >
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                          </button>
                          <span
                            className="text-[12px] font-semibold text-[#1565C0] cursor-pointer hover:opacity-80"
                            title="跳转到当前定位"
                            onClick={(e) => {
                              e.stopPropagation();
                              const id = clause.id;
                              const list = clauseLocateTargetsRef.current[id] || [];
                              const total = list.length;
                              if (!total) return;
                              const cur = clauseLocateIndex[id] ?? 1;
                              const q = list[Math.max(0, Math.min(cur - 1, total - 1))];
                              handleLocate(q);
                            }}
                          >
                            {(clauseLocateIndex[clause.id] ?? 0)}/{(clauseLocateTargetsRef.current[clause.id]?.length ?? 0)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const id = clause.id;
                              const list = clauseLocateTargetsRef.current[id] || [];
                              const total = list.length;
                              if (!total) return;
                              const cur = clauseLocateIndex[id] ?? 1;
                              const next = cur >= total ? 1 : cur + 1;
                              setClauseLocateIndex((m) => ({ ...m, [id]: next }));
                              const q = list[next - 1];
                              handleLocate(q);
                            }}
                            className="px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                            title="下一处"
                          >
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                          </button>
                        </div>
                        )}
                        {/* 智能修复/撤销修复 */}
                        {appliedRevisions.has(clause.id) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRevokeRevision(clause); }}
                            className="py-2 px-3 rounded-xl text-xs font-medium border border-gray-300 dark:border-white/20 text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 ml-auto"
                          >
                            撤销修复
                          </button>
                        ) : (
                          <LiquidButton
                            onClick={(e) => { e.stopPropagation(); handleApplyRevision(clause); }}
                            className="!py-2 !px-3 !rounded-xl !text-xs flex items-center justify-center gap-1.5 ml-auto"
                            variant="primary"
                          >
                            智能修复
                          </LiquidButton>
                        )}
                      </div>
                    </div>
                  ))}

                {/* 手动批注卡片 */}
                {(reviewFilter === 'all' || reviewFilter === 'manual') && manualComments.length > 0 && (
                  <>
                    {reviewFilter === 'all' && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">手动批注</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      </div>
                    )}
                    {manualComments.map((comment) => (
                      <div
                        key={comment.id}
                        id={`manual-comment-${comment.id}`}
                        className="p-4 rounded-[20px] bg-white dark:bg-[#2C2C2E] shadow-md dark:shadow-lg border border-blue-100 dark:border-blue-900/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-[#007AFF] dark:bg-blue-900/40 dark:text-[#0A84FF]">
                            手动批注
                          </span>
                          <button
                            onClick={() => {
                              // 删除时也要从风险映射中移除
                              riskMapRef.current.delete(comment.index.toString());
                              setManualComments(prev => prev.filter(c => c.id !== comment.id));
                            }}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 hover:text-red-500 transition-colors"
                            title="删除批注"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                        <p className="text-sm text-slate-800 dark:text-slate-200 mb-2">
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-700/30 text-[#007AFF] dark:text-[#0A84FF] text-[10px] font-bold mr-1.5 shadow-sm">
                            {comment.index}
                          </span>
                          {comment.content}
                        </p>
                        <div className="bg-gray-50 dark:bg-black/30 rounded-lg p-2">
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            标注文本
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {comment.selectedText.length > 100 ? comment.selectedText.slice(0, 100) + '...' : comment.selectedText}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {comment.createdAt.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => {
                              const button = e.currentTarget as HTMLElement;
                              const rect = button.getBoundingClientRect();
                              const buttonWidth = rect.width;
                              const modalHeight = Math.min(200, window.innerHeight * 0.4);
                              
                              // 计算位置，确保不超出屏幕
                              let top = rect.bottom + 8;
                              let left = rect.left;
                              
                              // 如果下方空间不足，显示在上方
                              if (top + modalHeight > window.innerHeight - 16) {
                                top = rect.top - modalHeight - 8;
                              }
                              
                              // 如果右侧超出，调整到左侧
                              if (left + buttonWidth > window.innerWidth - 16) {
                                left = window.innerWidth - buttonWidth - 16;
                              }
                              
                              // 确保不超出左边界
                              if (left < 16) {
                                left = 16;
                              }
                              
                              // 确保不超出上边界
                              if (top < 16) {
                                top = 16;
                              }
                              
                              setOriginalTextModal({ 
                                visible: true, 
                                text: comment.selectedText,
                                position: { top, left, width: buttonWidth }
                              });
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-white/20 hover:text-[#007AFF] transition-colors"
                          >
                            原文
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* 空状态提示 */}
                {reviewFilter === 'manual' && manualComments.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">edit_note</span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">暂无手动批注</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">选中文本后点击"批注"按钮添加</p>
                  </div>
                )}
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
          )}
        </div>
      </div>

      {/* 原文弹窗 */}
      {originalTextModal.visible && originalTextModal.position && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-[200]"
            onClick={() => setOriginalTextModal({ visible: false, text: '' })}
          />
          {/* 弹窗内容 */}
          <div 
            className="fixed z-[201] bg-white dark:bg-[#2C2C2E] rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
            style={{
              top: `${originalTextModal.position.top}px`,
              left: `${originalTextModal.position.left}px`,
              width: `${originalTextModal.position.width || 200}px`,
              maxHeight: '200px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 内容区域 */}
            <div className="overflow-y-auto p-3 bg-white dark:bg-[#2C2C2E]">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                {originalTextModal.text}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EditorView;
