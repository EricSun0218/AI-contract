
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import EditorView from './components/EditorView';
import { ContractFile, RiskItem, ViewState } from './types';

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

const MOCK_RISKS: RiskItem[] = [
  {
    id: 'r1',
    title: '价格与支付条款',
    description: '缺失收款账户详细信息。',
    analysis: '条款中仅提供了银行账号，未明确收款人全称及纳税人识别号，可能导致发票开具困难、税务合规风险及付款失败。',
    suggestion: '建议补充：收款人名称、纳税人识别号及开户行详细信息。',
    level: 'high'
  },
  {
    id: 'r2',
    title: '主体责任条款',
    description: '违约金比例过高。',
    analysis: '0.5%的日违约金比例远高于市场标准（通常为0.05%），可能被法院判定为过高而调整。',
    suggestion: '建议将违约金比例调整为每日0.05%。',
    level: 'medium'
  },
  {
    id: 'r3',
    title: '争议解决',
    description: '管辖法院约定不明。',
    analysis: '条款仅约定“向有管辖权的人民法院起诉”，未明确具体法院，可能导致管辖权异议拖延诉讼进程。',
    suggestion: '建议明确为：向甲方所在地有管辖权的人民法院起诉。',
    level: 'low'
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('upload');
  const [activeFile, setActiveFile] = useState<ContractFile>(MOCK_FILES[0]);

  // Dark mode initialization
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="font-sans h-screen flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 bg-[#F2F2F7] dark:bg-[#000000]">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/30 dark:bg-blue-600/20 blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-300/30 dark:bg-indigo-600/20 blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-200/30 dark:bg-purple-800/20 blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex flex-1 w-full h-full relative z-10 overflow-hidden">
        <Sidebar 
          files={MOCK_FILES} 
          onNewTask={() => setCurrentView('upload')} 
          currentView={currentView}
        />
        
        {currentView === 'upload' ? (
          <UploadView onStart={() => setCurrentView('editor')} />
        ) : (
          <EditorView 
            file={activeFile}
            risks={MOCK_RISKS} 
          />
        )}
      </div>
    </div>
  );
};

export default App;
