import React from 'react';
import { LiquidButton } from './GlassUI';

interface UploadViewProps {
  onStart: () => void;
}

const UploadView: React.FC<UploadViewProps> = ({ onStart }) => {
  return (
    <div className="flex-1 overflow-y-auto p-0 flex flex-col items-center justify-center h-full w-full relative z-10">
      <div className="w-full max-w-[1400px] h-full flex flex-col items-center justify-center px-12 py-8 animate-fade-in-up">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-[32px] bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shadow-xl border border-white/50 dark:border-white/10 backdrop-blur-md">
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
          {['合同场景', '审查立场', '审查尺度'].map((label, i) => (
            <div key={label} className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-4 uppercase tracking-widest opacity-80">{label}</label>
              <div className="relative group">
                <select className="appearance-none bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 text-slate-800 dark:text-slate-100 py-3.5 pl-6 pr-14 rounded-full outline-none focus:ring-2 focus:ring-[#007AFF]/50 cursor-pointer w-[240px] text-base font-medium transition-all hover:bg-white/60 dark:hover:bg-white/15 shadow-sm">
                  {i === 0 && <>
                    <option>采购</option>
                    <option>销售</option>
                    <option>服务</option>
                    <option>保密协议</option>
                  </>}
                  {i === 1 && <>
                    <option>买方</option>
                    <option>卖方</option>
                    <option>中立</option>
                  </>}
                  {i === 2 && <>
                    <option>均衡</option>
                    <option>严格</option>
                    <option>宽松</option>
                  </>}
                </select>
                <span className="material-symbols-outlined absolute right-5 top-3.5 text-slate-400 pointer-events-none text-xl group-hover:text-slate-600 transition-colors">expand_more</span>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Zone */}
        <div 
          onClick={onStart}
          className="w-full max-w-4xl h-[320px] rounded-[48px] border-2 border-dashed border-blue-300/40 dark:border-blue-700/30 bg-white/30 dark:bg-white/5 backdrop-blur-md flex flex-col items-center justify-center relative group hover:border-[#007AFF]/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-all duration-500 cursor-pointer mb-10 shadow-lg overflow-hidden"
        >
          <input className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" type="file" />
          
          {/* Animated Glows */}
          <div className="absolute w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] -top-10 -left-10 pointer-events-none transition-transform group-hover:scale-125 duration-1000"></div>
          <div className="absolute w-64 h-64 bg-indigo-400/20 rounded-full blur-[80px] -bottom-10 -right-10 pointer-events-none transition-transform group-hover:scale-125 duration-1000"></div>

          <div className="w-24 h-24 bg-gradient-to-b from-[#007AFF] to-[#5856D6] rounded-[28px] shadow-2xl shadow-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300 relative z-0">
            <span className="material-symbols-outlined text-white text-5xl drop-shadow-md">cloud_upload</span>
          </div>
          <p className="text-2xl font-semibold text-slate-700 dark:text-slate-100 mb-2 group-hover:text-[#007AFF] transition-colors relative z-0 tracking-tight">
            拖拽或点击此处上传文件
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 relative z-0 font-medium">
            支持格式：DOC, DOCX, PDF <span className="mx-2 opacity-50">|</span> 最多10个文件
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center w-full mb-6">
          <LiquidButton onClick={onStart} className="py-4 px-20 rounded-full text-lg font-bold shadow-xl shadow-blue-500/40 hover:shadow-blue-500/60">
            <span className="material-symbols-outlined text-2xl">play_arrow</span>
            开始审查
          </LiquidButton>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 font-medium opacity-60 hover:opacity-90 transition-opacity">
          <p>如需无缝集成，请查看我们的 <a className="text-[#007AFF] hover:text-[#5856D6] transition-colors underline decoration-transparent hover:decoration-[#007AFF]" href="#">合同审查 API</a></p>
        </div>

      </div>
    </div>
  );
};

export default UploadView;