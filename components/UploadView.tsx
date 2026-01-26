import React, { useRef, useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { LiquidButton } from './GlassUI';

interface UploadViewProps {
  onFileSelect: (file: File) => void;
  onStart: () => void;
}

// 自定义下拉组件
interface CustomSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-4 uppercase tracking-widest opacity-80">{label}</label>
      <div className="relative group" ref={selectRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-[240px] appearance-none bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 text-slate-800 dark:text-slate-100 py-3.5 pl-6 pr-12 rounded-full outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 cursor-pointer text-base font-medium hover:bg-white/60 dark:hover:bg-white/15 hover:border-white/60 dark:hover:border-white/20 shadow-sm flex items-center justify-between transition-all"
        >
          <span>{value}</span>
          <svg 
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'text-[#007AFF] rotate-180' : 'group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            viewBox="0 0 24 24"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        
        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#1a1a1a] backdrop-blur-md border border-white/40 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-6 py-3 text-base font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/10 ${
                  value === option
                    ? 'bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF]'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const UploadView: React.FC<UploadViewProps> = ({ onFileSelect, onStart }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  // 下拉框状态
  const [contractScenario, setContractScenario] = useState('采购');
  const [reviewPosition, setReviewPosition] = useState('买方');
  const [reviewScale, setReviewScale] = useState('均衡');

  // 重置文件输入，允许重新选择文件
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // 验证文件类型
    const validTypes = ['.doc', '.docx', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      alert('不支持的文件格式，请上传 DOC、DOCX 或 PDF 文件');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleStart = () => {
    if (selectedFile) {
      setIsStarting(true);
      // 2秒后进入AI解析页面
      setTimeout(() => {
        onStart();
      }, 2000);
    } else {
      alert('请先选择要审查的文档');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-on-hover p-0 flex flex-col items-center justify-center h-full w-full relative z-10">
      <div className="w-full max-w-[1400px] h-full flex flex-col items-center justify-center px-12 py-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-[32px] bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shadow-xl border border-white/50 dark:border-white/10 backdrop-blur-md transition-transform hover:scale-105">
            <span className="material-symbols-outlined text-[#007AFF] dark:text-[#0A84FF] text-6xl drop-shadow-sm">travel_explore</span>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            智能合同审查
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed font-light">
            精准定位条款文本，提供专业的风险判断、全面分析及修改示例。
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-10 w-full">
          <CustomSelect
            label="合同场景"
            options={['采购', '销售', '服务', '保密协议']}
            value={contractScenario}
            onChange={setContractScenario}
          />
          <CustomSelect
            label="审查立场"
            options={['买方', '卖方', '中立']}
            value={reviewPosition}
            onChange={setReviewPosition}
          />
          <CustomSelect
            label="审查尺度"
            options={['均衡', '严格', '宽松']}
            value={reviewScale}
            onChange={setReviewScale}
          />
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`w-full max-w-4xl h-[320px] rounded-[48px] border-2 border-dashed backdrop-blur-md flex flex-col items-center justify-center relative cursor-pointer mb-10 shadow-lg overflow-hidden dark:bg-white/5 transition-all ${
            isDragging 
              ? 'border-[#007AFF] bg-blue-50/50 dark:bg-blue-900/20' 
              : 'border-blue-400/40 bg-white/30 hover:scale-[1.01]'
          }`}
        >
          <input 
            ref={fileInputRef}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
            type="file" 
            accept=".doc,.docx,.pdf"
            onChange={handleFileInputChange}
          />
          
          {/* Animated Glows */}
          <div className={`absolute w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] -top-10 -left-10 pointer-events-none transition-transform ${isDragging ? 'scale-130' : 'animate-blob'}`} />
          <div className={`absolute w-64 h-64 bg-indigo-400/20 rounded-full blur-[80px] -bottom-10 -right-10 pointer-events-none transition-transform ${isDragging ? 'scale-130' : 'animate-blob'}`} style={{ animationDelay: '0.5s' }} />

          <div className="w-24 h-24 bg-gradient-to-b from-[#007AFF] to-[#5856D6] rounded-[28px] shadow-2xl shadow-blue-500/30 flex items-center justify-center mb-6 relative z-0 transition-transform hover:scale-110 hover:rotate-5 active:scale-95">
            <span className="material-symbols-outlined text-white text-5xl drop-shadow-md">cloud_upload</span>
          </div>
          {selectedFile ? (
            <>
              <p className="text-xl font-semibold text-[#007AFF] mb-2 relative z-0 tracking-tight">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 relative z-0 font-medium">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-700 dark:text-slate-100 mb-2 group-hover:text-[#007AFF] transition-colors relative z-0 tracking-tight">
                拖拽或点击此处上传文件
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 relative z-0 font-medium">
                支持格式：DOC, DOCX, PDF <span className="mx-2 opacity-50">|</span> 最多10个文件
              </p>
            </>
          )}
        </div>

        {/* Action Button & Progress */}
        <div className="flex flex-col items-center justify-center w-full mb-6 gap-4">
          <LiquidButton 
            onClick={handleStart} 
            className="py-4 px-20 rounded-full text-lg font-bold shadow-xl shadow-blue-500/40 hover:shadow-blue-500/60"
            disabled={!selectedFile || isStarting}
          >
            {isStarting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                <span>开始审查</span>
              </>
            ) : (
              <span>开始审查</span>
            )}
          </LiquidButton>
          
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 font-medium opacity-60 hover:opacity-90 transition-opacity">
          <p>本系统由 AI 自动生成审查结果，仅供参考，请结合实际情况进行判断</p>
        </div>

      </div>
    </div>
  );
};

export default UploadView;