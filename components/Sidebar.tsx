import React from 'react';
import { GlassPane, LiquidButton } from './GlassUI';
import { ContractFile } from '../types';

interface SidebarProps {
  files: ContractFile[];
  onNewTask: () => void;
  currentView: 'upload' | 'editor';
}

const Sidebar: React.FC<SidebarProps> = ({ files, onNewTask, currentView }) => {
  return (
    <GlassPane className="w-64 h-full border-r border-white/40 dark:border-white/10 flex flex-col flex-shrink-0 z-20">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-[10px] flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[18px]">description</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-800 dark:text-white">
            SC<span className="font-light opacity-70">Ai</span>
          </span>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 pb-2">
        <LiquidButton onClick={onNewTask} className="w-full py-2.5 mb-6">
          <span className="material-symbols-outlined text-xl">add</span>
          <span className="text-sm">新建任务</span>
        </LiquidButton>

        <div className="flex items-center justify-between mb-3 px-2 shrink-0">
          <button className="flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider gap-1 hover:text-[#007AFF] transition-colors">
            最近文件
          </button>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined text-base">search</span>
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-2 px-2">
          {files.map((file) => (
            <div 
              key={file.id}
              className={`
                group flex items-center gap-3 p-2.5 rounded-[16px] 
                cursor-pointer transition-all border border-transparent 
                ${currentView === 'editor' && file.id === '1' 
                  ? 'bg-white/60 dark:bg-white/10 border-white/40 shadow-sm' 
                  : 'bg-white/20 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 hover:border-white/30'}
              `}
            >
              <div className={`
                w-8 h-8 rounded-xl flex items-center justify-center shadow-sm shrink-0
                ${file.type === 'doc' 
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-600 dark:text-blue-400'
                  : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 text-red-500 dark:text-red-400'}
              `}>
                <span className="font-bold text-[10px]">{file.type === 'doc' ? 'W' : 'P'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-[#007AFF] transition-colors">
                  {file.name}
                </h4>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{file.date}</span>
                  {file.status === 'completed' && (
                    <span className="material-symbols-outlined text-[14px] text-green-500">check_circle</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/20 dark:border-white/5 shrink-0 bg-white/10 dark:bg-black/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer transition-all group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200 shadow-inner shrink-0">
            JD
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-[#007AFF] transition-colors">
              John Doe
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Premium Plan</span>
          </div>
        </div>
      </div>
    </GlassPane>
  );
};

export default Sidebar;