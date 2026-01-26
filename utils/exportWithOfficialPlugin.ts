/**
 * 使用官方插件的导出 API，然后通过后端 Python 服务添加批注
 */
import type { ClauseRisk } from '../types';

// 与 canvas-editor 元素兼容
type CEElement = {
  value?: string;
  type?: string;
  bold?: boolean;
  italic?: boolean;
  size?: number;
  font?: string;
  underline?: boolean;
  color?: string;
  strikeout?: boolean;
  highlight?: string;
  valueList?: CEElement[];
  trList?: { tdList?: { value?: CEElement[]; colspan?: number; rowspan?: number }[] }[];
  level?: number;
  listStyle?: string;
  width?: number;
  height?: number;
  url?: string;
  groupIds?: string[];
};

export interface CanvasComment {
  id: string;
  content: string;
  userName?: string;
  userId?: string;
  time?: string;
  selectedText?: string; // 手动批注的选中文本，用于后端定位
}

export interface ExportWithOfficialPluginInput {
  main: CEElement[];
  header?: CEElement[];
  footer?: CEElement[];
  clauseRisks: ClauseRisk[];
  appliedRevisions: Set<string>;
  fileName: string;
  comments?: CanvasComment[];
}

/**
 * 使用官方插件的导出逻辑生成 docx blob，然后发送到后端 Python 服务添加批注
 * 
 * @param editorInstance - 编辑器实例，用于调用官方插件的导出方法
 */
export async function exportWithOfficialPluginAndAddComments(
  input: ExportWithOfficialPluginInput,
  editorInstance?: any
): Promise<void> {
  const { main, header, footer, clauseRisks, appliedRevisions, fileName, comments } = input;
  
  try {
    console.log('使用官方插件导出逻辑生成 docx...');
    
    // 构建批注数据，发送到后端
    const commentsData = buildCommentsData(clauseRisks, appliedRevisions, comments || []);
    
    // 方案：直接使用官方插件的 executeExportDocx，但拦截下载获取 blob
    let docxBlob: Blob;
    
    if (editorInstance) {
      // 如果有编辑器实例，使用官方插件的导出方法，但拦截下载
      docxBlob = await interceptOfficialExport(editorInstance, fileName);
    } else {
      throw new Error('需要编辑器实例来使用官方插件导出。请传入 editorInstance 参数');
    }
    
    // 发送到后端 Python 服务添加批注
    await sendToBackendAndAddComments(docxBlob, commentsData, fileName);
    
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

/**
 * 拦截官方插件的导出，获取 blob
 */
async function interceptOfficialExport(editorInstance: any, fileName: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 保存原始方法
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    let interceptedBlob: Blob | null = null;
    let clickCalled = false;
    
    // 拦截 createObjectURL
    window.URL.createObjectURL = function(blob: Blob) {
      interceptedBlob = blob;
      const url = originalCreateObjectURL.call(this, blob);
      return url;
    };
    
    // 拦截 a.click()
    HTMLAnchorElement.prototype.click = function() {
      clickCalled = true;
      // 不执行下载，而是获取 blob
      if (interceptedBlob) {
        // 恢复原始方法
        window.URL.createObjectURL = originalCreateObjectURL;
        HTMLAnchorElement.prototype.click = originalClick;
        resolve(interceptedBlob);
      }
      // 不调用原始 click，阻止下载
    };
    
    // 调用官方插件的导出方法
    const cmd = editorInstance?.command;
    if (cmd?.executeExportDocx) {
      try {
        // executeExportDocx 不返回 Promise，直接调用即可
        // 它会内部调用 Jf.toBlob，然后调用 h2 下载
        // 我们通过拦截 createObjectURL 和 click 来获取 blob
        cmd.executeExportDocx({ fileName });
      } catch (err: any) {
        // 恢复原始方法
        window.URL.createObjectURL = originalCreateObjectURL;
        HTMLAnchorElement.prototype.click = originalClick;
        reject(err);
      }
    } else {
      // 恢复原始方法
      window.URL.createObjectURL = originalCreateObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
      reject(new Error('编辑器实例不支持 executeExportDocx'));
    }
    
    // 超时处理
    setTimeout(() => {
      if (!clickCalled && !interceptedBlob) {
        window.URL.createObjectURL = originalCreateObjectURL;
        HTMLAnchorElement.prototype.click = originalClick;
        reject(new Error('未能拦截到官方插件的导出 blob（超时）'));
      }
    }, 10000);
  });
}

/**
 * 构建批注数据，用于发送到后端
 */
function buildCommentsData(
  clauseRisks: ClauseRisk[],
  appliedRevisions: Set<string>,
  comments: CanvasComment[]
): any[] {
  // 构建批注数据格式，供 Python 后端使用
  const commentsData: any[] = [];
  
  // 处理 AI 风险批注
  let globalRiskIndex = 1;
  const riskIndexMap = new Map<string, number>();
  clauseRisks.forEach((clause) => {
    clause.risks.forEach((risk) => {
      riskIndexMap.set(risk.id, globalRiskIndex++);
    });
  });
  
  for (const clause of clauseRisks) {
    const fixed = appliedRevisions.has(clause.id);
    
    if (clause.type === 'missing_clause') {
      // 缺失条款：收集所有风险的信息
      const allRiskDescs: string[] = [];
      const allRiskIndices: number[] = [];
      for (const r of clause.risks) {
        const riskIndex = riskIndexMap.get(r.id) ?? 0;
        if (riskIndex > 0) {
          allRiskIndices.push(riskIndex);
        }
        if (r.description) {
          allRiskDescs.push(r.description);
        }
      }
      
      // 已修复时，批注应该附加到新增的内容上；未修复时，附加到标题
      let location: string;
      if (fixed && clause.revision) {
        // 插入时使用的是 \n\n${clause.revision}，所以需要匹配实际插入的内容
        // 使用第一行文本作为定位，因为第一行更容易匹配
        const firstLine = clause.revision.split('\n')[0]?.trim();
        if (firstLine && firstLine.length > 0) {
          // 使用第一行的前30个字符，确保能够匹配
          location = firstLine.substring(0, 30);
        } else {
          // 如果没有第一行，使用整个 revision 的前30个字符（去除换行）
          location = clause.revision.replace(/\n+/g, ' ').trim().substring(0, 30);
        }
        console.log(`[buildCommentsData] Missing clause fixed, using location: "${location}" from revision: "${clause.revision.substring(0, 50)}..."`);
      } else {
        location = 'title';
        console.log(`[buildCommentsData] Missing clause not fixed, using location: "title"`);
      }
      
      commentsData.push({
        type: 'missing_clause',
        fixed,
        riskIndices: allRiskIndices, // 所有风险的序号
        riskDescs: allRiskDescs, // 所有风险的描述
        riskIndex: allRiskIndices[0] || 0, // 第一个风险序号（向后兼容）
        riskDesc: allRiskDescs.join('；') || '缺失条款', // 合并所有风险描述
        suggestion: clause.revision,
        location, // 已修复时使用新增内容的第一行，未修复时使用标题
      });
    } else {
      // 普通条款：对于每个 location，如果已修复则使用 replacement，未修复则使用原文
      // 如果一个条款有多个风险，每个 location 的批注需要包含所有风险的信息
      const clauseRiskDescs: string[] = [];
      const clauseRiskIndices: number[] = [];
      for (const rp of clause.risks) {
        const riskIndex = riskIndexMap.get(rp.id) ?? 0;
        if (riskIndex > 0) {
          clauseRiskIndices.push(riskIndex);
        }
        if (rp.description) {
          clauseRiskDescs.push(rp.description);
        }
      }
      
      // 收集所有 location，去重（同一个 text 或 replacement 只生成一次批注）
      const locationMap = new Map<string, { text: string; replacement?: string }>();
      for (const rp of clause.risks) {
        for (const loc of rp.locations) {
          if (!loc?.text) continue;
          // 已修复时使用 replacement，未修复时使用原文
          const key = fixed && loc.replacement ? loc.replacement : loc.text;
          if (!locationMap.has(key)) {
            locationMap.set(key, { text: loc.text, replacement: loc.replacement });
          }
        }
      }
      
      // 为每个 location 生成批注
      for (const [locationKey, loc] of locationMap) {
        // 已修复时使用 replacement 作为 location，未修复时使用原文
        const location = fixed && loc.replacement ? loc.replacement : loc.text;
        
        commentsData.push({
          type: 'location',
          fixed,
          riskIndices: clauseRiskIndices, // 所有风险的序号
          riskDescs: clauseRiskDescs, // 所有风险的描述
          riskIndex: clauseRiskIndices[0] || 0, // 第一个风险序号（向后兼容）
          riskDesc: clauseRiskDescs.join('；') || '', // 合并所有风险描述
          suggestion: loc.replacement ?? clause.revision,
          location, // 已修复时使用 replacement，未修复时使用原文
        });
      }
    }
  }
  
  // 添加手动批注
  comments.forEach((comment) => {
    // 手动批注需要包含 selectedText 作为 location
    const selectedText = comment.selectedText || '';
    if (!selectedText) {
      console.warn('手动批注缺少 selectedText，无法定位到文档中的位置');
    }
    commentsData.push({
      type: 'manual',
      content: comment.content,
      userName: comment.userName || '用户',
      time: comment.time,
      location: selectedText, // 手动批注的选中文本，用于在文档中定位
    });
  });
  
  return commentsData;
}

/**
 * 发送 docx blob 到后端 Python 服务，添加批注后返回
 */
async function sendToBackendAndAddComments(
  docxBlob: Blob,
  commentsData: any[],
  fileName: string
): Promise<void> {
  // 构建 FormData
  const formData = new FormData();
  formData.append('docx', docxBlob, fileName);
  formData.append('comments', JSON.stringify(commentsData));
  
  // 发送到后端 Python 服务
  // TODO: 替换为实际的后端 API 地址
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const response = await fetch(`${backendUrl}/api/add-comments`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`后端服务错误: ${response.statusText}`);
  }
  
  // 获取修改后的文档
  const modifiedBlob = await response.blob();
  
  // 下载修改后的文档
  const url = URL.createObjectURL(modifiedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.docx') ? fileName : fileName + '.docx';
  a.click();
  URL.revokeObjectURL(url);
}
