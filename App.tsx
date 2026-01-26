import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import EditorView from './components/EditorView';
import { ContractFile, ClauseRisk, ViewState } from './types';

// Mock Data
const MOCK_FILES: ContractFile[] = [
  { 
    id: '1', 
    name: '设备采购合同_终稿.docx', 
    date: '今天 10:42', 
    status: 'completed', 
    type: 'doc',
    url: 'https://example.com/contracts/device_purchase_final.docx'
  },
  { id: '2', name: '软件服务SLA_v2.pdf', date: '昨天 18:57', status: 'completed', type: 'pdf' },
  { id: '3', name: '保密协议模板_2024.docx', date: '10月24日 09:15', status: 'completed', type: 'doc' },
];

// 测试数据：locations 带 replacement 表示真实替换；编辑时原文显示为棕色+黑删除线，替换文紧跟其后；导出时只保留最终结果
const MOCK_CLAUSE_RISKS: ClauseRisk[] = [
  {
    id: 'c1',
    clauseName: '第二条 价格与支付',
    clauseNumber: '2',
    risks: [
      {
        id: 'r1-1',
        description: '缺失收款账户详细信息。',
        analysis: '条款中仅提供了银行账号，未明确收款人全称及纳税人识别号，可能导致发票开具困难、税务合规风险及付款失败。',
        level: 'high',
        locations: [
          { text: '6222 0000 0000 0000', replacement: '6222 0000 0000 0001（户名：深蓝精密仪器有限公司，开户行：xx银行xx支行）' },
          { text: '2.2 支付方式：银行转账', replacement: '2.2 支付方式：银行转账。收到发票后15个工作日内支付；逾期按日万分之五承担违约金。' },
        ],
      },
      {
        id: 'r1-2',
        description: '支付方式约定过于简略。',
        analysis: '未约定付款期限、发票开具时点及逾期付款责任，易引发争议。',
        level: 'medium',
        locations: [{ text: '2.2 支付方式：银行转账', replacement: '2.2 支付方式：银行转账。收到发票后15个工作日内支付；逾期按日万分之五承担违约金。' }],
      },
    ],
    revision: '建议补充：收款人全称、纳税人识别号、开户行名称及完整账号；明确付款期限（如“收到发票后 15 个工作日内”）、发票开具时点及逾期付款按日万分之五承担违约责任。',
  },
  {
    id: 'c2',
    clauseName: '第三条 违约责任',
    clauseNumber: '3',
    risks: [
      {
        id: 'r2-1',
        description: '违约金比例过高。',
        analysis: '0.5%的日违约金比例远高于市场标准（通常为0.05%），可能被法院判定为过高而调整。',
        level: 'medium',
        locations: [{ text: '0.5%', replacement: '0.05%' }],
      },
    ],
    revision: '建议将日违约金比例从 0.5% 调整为 0.05%，并增加“若守约方实际损失明显高于上述比例，有权按实际损失主张”的衔接条款。',
  },
  {
    id: 'c3',
    clauseName: '第四条 争议解决',
    clauseNumber: '4',
    risks: [
      {
        id: 'r3-1',
        description: '管辖法院约定不明。',
        analysis: '条款仅约定“向有管辖权的人民法院起诉”，未明确具体法院，可能导致管辖权异议拖延诉讼进程。',
        level: 'low',
        locations: [{ text: '有管辖权的人民法院', replacement: '甲方所在地有管辖权的人民法院' }],
      },
    ],
    revision: '建议明确为：向甲方所在地有管辖权的人民法院起诉。',
  },
  {
    id: 'c4',
    clauseName: '缺失：第六条 保密条款',
    clauseNumber: '6',
    type: 'missing_clause',
    risks: [
      {
        id: 'r4-1',
        description: '合同未约定保密条款。',
        analysis: '设备采购涉及技术参数、商业条件等敏感信息，未约定保密义务、保密期限及泄密责任，不利于保护双方商业秘密。',
        level: 'high',
        locations: [],
      },
    ],
    revision: '第六条 保密\n    6.1 双方应对本合同履行过程中知悉的对方商业秘密、技术资料等保密信息承担保密义务，保密期限为合同终止后三年。\n    6.2 一方违反保密义务造成对方损失的，应承担全部赔偿责任。',
  },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('upload');
  const [activeFile, setActiveFile] = useState<ContractFile>(MOCK_FILES[0]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Dark mode initialization
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 滚动条仅在滚动时显示，停止后约 0.8s 消失
  useEffect(() => {
    const timeouts = new Map<Element, ReturnType<typeof setTimeout>>();
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el?.classList?.contains('scrollbar-on-hover')) return;
      el.classList.add('scrollbar-visible');
      const tid = timeouts.get(el);
      if (tid) clearTimeout(tid);
      timeouts.set(el, setTimeout(() => {
        el.classList.remove('scrollbar-visible');
        timeouts.delete(el);
      }, 800));
    };
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      timeouts.forEach((tid) => clearTimeout(tid));
    };
  }, []);

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    // 创建 ContractFile 对象
    const contractFile: ContractFile = {
      id: Date.now().toString(),
      name: file.name,
      date: new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'processing',
      type: file.name.endsWith('.pdf') ? 'pdf' : 'doc',
    };
    setActiveFile(contractFile);
  };

  const handleStart = () => {
    if (uploadedFile) {
      setCurrentView('editor');
    }
  };

  return (
    <div className="font-sans h-screen flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 bg-[#F2F2F7] dark:bg-[#000000]">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/30 dark:bg-blue-600/20 blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-300/30 dark:bg-indigo-600/20 blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-200/30 dark:bg-purple-800/20 blur-[100px] animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      <div className="flex flex-1 w-full h-full relative z-10 overflow-hidden">
        <Sidebar 
          files={MOCK_FILES} 
          onNewTask={() => {
            setCurrentView('upload');
            setUploadedFile(null);
          }} 
          currentView={currentView}
        />
        
        {currentView === 'upload' ? (
          <UploadView 
            key={currentView}
            onFileSelect={handleFileSelect}
            onStart={handleStart} 
          />
        ) : (
          <EditorView 
            file={activeFile}
            uploadedFile={uploadedFile || undefined}
            clauseRisks={MOCK_CLAUSE_RISKS} 
          />
        )}
      </div>
    </div>
  );
};

export default App;
