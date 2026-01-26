/**
 * 自建 Word 导出：将 canvas-editor 的 getValue().data 转为 docx，并注入批注。
 * 完全按照 @hufe921/canvas-editor-plugin-docx 的转换规则实现，以确保与官方导出完全一致的格式；
 * 仅删除 strikeout 与 INSERTION_COLOR（新增部分仅在样式中删除，正文保留）。
 */
import {
  Document as DocxFile,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  WidthType,
  ImageRun,
  ExternalHyperlink,
  Tab,
  HeadingLevel,
} from 'docx';
import type { ClauseRisk } from '../types';

// 与 canvas-editor 元素兼容；clean 后无 strikeout、无 INSERTION_COLOR
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
}

export interface ExportWithCommentsInput {
  main: CEElement[];
  header?: CEElement[];
  footer?: CEElement[];
  clauseRisks: ClauseRisk[];
  appliedRevisions: Set<string>;
  fileName: string;
  comments?: CanvasComment[];
}

// 批注序号正则：匹配 【N】 格式的序号（这些序号仅用于编辑器显示，不应导出）
const COMMENT_INDICATOR_REGEX = /【\d+】/g;

/** 从元素树收集纯文本（用于定位），与 elementsToParagraphs 的 addRun 一致：\n 作空格，移除批注序号 */
function elementsToPlainText(arr: CEElement[]): string {
  let s = '';
  for (const el of arr) {
    if (el.strikeout) continue;
    if (el.value != null) {
      // 移除批注序号后再添加到纯文本
      const cleanValue = el.value.replace(COMMENT_INDICATOR_REGEX, '');
      s += cleanValue.replace(/\n/g, ' ');
    }
    if (Array.isArray(el.valueList)) s += elementsToPlainText(el.valueList);
    if (Array.isArray(el.trList)) {
      for (const tr of el.trList) {
        for (const td of tr.tdList || []) {
          if (Array.isArray(td.value)) s += elementsToPlainText(td.value);
        }
      }
    }
  }
  return s;
}

// 与插件 Io 一致：size  (e.size||16)/0.75 pt，color 仅接受 #hex 否则 #000000
function toHex(c: string | undefined): string {
  if (!c) return '#000000';
  if (/^#[0-9A-Fa-f]{3,8}$/.test(c)) return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c;
  return '#000000';
}

// 标题级别映射（与官方插件一致）
const HEADING_MAP: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/** 取元素的 run 样式（用于 TextRun），完全与官方插件的 Io 函数一致 */
function runOpts(el: CEElement): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (el.font) o.font = el.font;
  o.bold = el.bold;
  o.italics = el.italic;
  o.size = `${(el.size ?? 16) / 0.75}pt`;
  o.color = toHex(el.color);
  o.strike = el.strikeout;
  o.highlight = el.highlight ? toHex(el.highlight) : undefined;
  o.superScript = el.type === 'superscript';
  o.subScript = el.type === 'subscript';
  o.underline = el.underline ? {} : undefined;
  return o;
}

interface Anchor {
  id: number;
  start: number;
  end: number;
  fixed: boolean;
  riskDesc: string;
  suggestion: string;
  riskIndex: number;
}

/** 构建批注锚点：每个 location 一条；缺失条款未修复→标题，已修复→插入段 */
function buildAnchors(
  clauseRisks: ClauseRisk[],
  appliedRevisions: Set<string>,
  fullText: string,
  main: CEElement[]
): Anchor[] {
  const anchors: Anchor[] = [];
  let id = 0;
  const nextSearch = new Map<string, number>();

  // 计算风险序号（与 EditorView 保持一致）
  let globalRiskIndex = 1;
  const riskIndexMap = new Map<string, number>();
  clauseRisks.forEach((clause) => {
    clause.risks.forEach((risk) => {
      riskIndexMap.set(risk.id, globalRiskIndex++);
    });
  });

  // 找合同标题：第一个非空、非仅换行、较短且不以空格开头的 value，返回 { start, length }；与 fullText 的 \n→空格 一致
  function findTitle(): { start: number; length: number } | null {
    function scan(arr: CEElement[]): { start: number; length: number } | null {
      for (const el of arr) {
        const v = el.value;
        if (v != null && v !== '' && v !== '\n' && /^\S/.test(v) && v.length < 200) {
          const n = v.replace(/\n/g, ' ');
          const start = fullText.indexOf(n);
          if (start >= 0) return { start, length: n.length };
        }
        if (Array.isArray(el.valueList)) { const r = scan(el.valueList); if (r != null) return r; }
        if (Array.isArray(el.trList)) {
          for (const tr of el.trList || [])
            for (const td of tr.tdList || [])
              if (Array.isArray(td.value)) { const r = scan(td.value); if (r != null) return r; }
        }
      }
      return null;
    }
    return scan(main);
  }

  // 找 revision 全文在 fullText 中的起始位置（用于缺失已修复）；fullText 中 \n 已作空格
  function findRevisionStart(revision: string): { start: number; len: number } | null {
    const norm = revision.replace(/\n/g, ' ');
    const idx = fullText.indexOf(norm);
    if (idx >= 0) return { start: idx, len: norm.length };
    const firstLine = revision.split('\n')[0];
    if (firstLine) {
      const i = fullText.indexOf(firstLine);
      if (i >= 0) return { start: i, len: norm.length };
    }
    return null;
  }

  for (const clause of clauseRisks) {
    const fixed = appliedRevisions.has(clause.id);

    if (clause.type === 'missing_clause') {
      const r = clause.risks[0];
      const riskDesc = r?.description ?? '缺失条款';
      const suggestion = clause.revision;
      const riskIndex = r ? (riskIndexMap.get(r.id) ?? 0) : 0;

      if (!fixed) {
        const tit = findTitle();
        if (tit != null) {
          anchors.push({ id: ++id, start: tit.start, end: tit.start + tit.length, fixed: false, riskDesc, suggestion, riskIndex });
        }
      } else {
        const rev = findRevisionStart(clause.revision);
        if (rev) {
          anchors.push({ id: ++id, start: rev.start, end: rev.start + rev.len, fixed: true, riskDesc, suggestion, riskIndex });
        }
      }
      continue;
    }

    for (const rp of clause.risks) {
      const riskIndex = riskIndexMap.get(rp.id) ?? 0;
      for (const loc of rp.locations) {
        if (!loc?.text) continue;
        const from = nextSearch.get(loc.text) ?? 0;
        const idx = fullText.indexOf(loc.text, from);
        if (idx < 0) continue;
        nextSearch.set(loc.text, idx + 1);
        const suggestion = loc.replacement ?? clause.revision;
        anchors.push({
          id: ++id,
          start: idx,
          end: idx + loc.text.length,
          fixed: appliedRevisions.has(clause.id),
          riskDesc: rp.description,
          suggestion,
          riskIndex,
        });
      }
    }
  }

  return anchors;
}

function hasGroupIds(arr: CEElement[]): boolean {
  for (const el of arr) {
    if (el.groupIds && el.groupIds.length > 0) return true;
    if (el.valueList && hasGroupIds(el.valueList)) return true;
    if (el.trList) {
      for (const tr of el.trList) {
        if (tr.tdList) {
          for (const td of tr.tdList) {
            if (td.value && hasGroupIds(td.value)) return true;
          }
        }
      }
    }
  }
  return false;
}

type DocxBodyChild = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;

/** 清理文本中的批注序号 */
function cleanIndicators(text: string | undefined): string {
  if (!text) return '';
  return text.replace(COMMENT_INDICATOR_REGEX, '');
}

/** 转换单个元素（与官方插件 Io 函数完全一致），移除批注序号 */
function convertElement(el: CEElement): any {
  if (el.type === 'image') {
    return new ImageRun({
      data: el.value,
      transformation: {
        width: el.width,
        height: el.height,
      },
    });
  } else if (el.type === 'hyperlink') {
    return new ExternalHyperlink({
      children: [
        new TextRun({
          text: cleanIndicators(el.valueList?.map((n) => n.value).join('')),
          style: 'Hyperlink',
        }),
      ],
      link: el.url,
    });
  } else if (el.type === 'tab') {
    return new TextRun({
      children: [new Tab()],
    });
  } else if (el.type === 'latex') {
    return new TextRun({
      text: cleanIndicators(el.value),
    });
  } else {
    return new TextRun({
      text: cleanIndicators(el.value),
      ...runOpts(el),
    });
  }
}

/** 将元素转为 docx (Paragraph|Table)[]，完全按照官方插件 _i 函数逻辑，然后在此基础上添加批注 */
function elementsToParagraphs(
  arr: CEElement[],
  opts: { fullText: string; anchors: Anchor[]; comments?: CanvasComment[]; commentIdMap?: Map<string, number> }
): DocxBodyChild[] {
  const { fullText, anchors, comments, commentIdMap } = opts;
  const body: DocxBodyChild[] = [];
  const runs: { text: string; start: number; opts: Record<string, unknown>; groupIds?: string[] }[] = [];
  let globalStart = 0;
  // 用于跟踪当前活跃的 docx comment ID（仅当使用 comments 模式时）
  let activeDocxIds = new Set<number>();

  function flushPara() {
    if (runs.length === 0) {
      body.push(new Paragraph({ text: '' }));
      return;
    }
    const children: (InstanceType<typeof TextRun> | CommentRangeStart | CommentRangeEnd | CommentReference)[] = [];

    // 优先使用编辑器自带的 comments 数据
    if (comments && commentIdMap) {
      for (const r of runs) {
        const targetDocxIds = new Set<number>();
        if (r.groupIds) {
          r.groupIds.forEach((gid) => {
            const did = commentIdMap.get(gid);
            if (did !== undefined) targetDocxIds.add(did);
          });
        }

        // 1. 结束不再活跃的 comments
        const endingIds = Array.from(activeDocxIds).filter((id) => !targetDocxIds.has(id));
        endingIds.forEach((id) => {
          children.push(new CommentRangeEnd(id));
          children.push(new CommentReference(id));
          activeDocxIds.delete(id);
        });

        // 2. 开启新出现的 comments
        const startingIds = Array.from(targetDocxIds).filter((id) => !activeDocxIds.has(id));
        startingIds.forEach((id) => {
          children.push(new CommentRangeStart(id));
          activeDocxIds.add(id);
        });

        // 3. 插入文本
        children.push(new TextRun({ text: r.text, ...r.opts }));
      }
    } else {
      // 降级：使用旧的 anchors 逻辑
      for (const r of runs) {
        const len = r.text.length;
        const runEnd = r.start + len;
        const overlapping = anchors
          .filter((a) => a.start < runEnd && a.end > r.start)
          .sort((a, b) => a.start - b.start || a.id - b.id);

        if (overlapping.length === 0) {
          children.push(new TextRun({ text: r.text, ...r.opts }));
          globalStart = runEnd;
          continue;
        }

        const points = [r.start, runEnd];
        for (const a of overlapping) {
          if (a.start > r.start && a.start < runEnd) points.push(a.start);
          if (a.end > r.start && a.end < runEnd) points.push(a.end);
        }
        points.sort((a, b) => a - b);

        // 新方案：直接使用 r.text，根据相对位置分割
        // 这样可以确保文本内容正确（使用 r.text），同时批注位置也正确（基于 fullText 的位置）
        for (let i = 0; i < points.length - 1; i++) {
          const p = points[i];
          const q = points[i + 1];
          
          // 计算在 r.text 中的相对位置
          const relStart = Math.max(0, p - r.start);
          const relEnd = Math.min(r.text.length, q - r.start);
          
          // 从 r.text 提取文本段（确保文本内容正确）
          const segText = r.text.substring(relStart, relEnd);
          
          const atStart = anchors.filter((a) => a.start === p).sort((a, b) => a.id - b.id);
          const atEnd = anchors.filter((a) => a.end === q).sort((a, b) => b.id - a.id);

          for (const a of atStart) children.push(new CommentRangeStart(a.id));
          if (segText) children.push(new TextRun({ text: segText, ...r.opts }));
          for (const a of atEnd) {
            children.push(new CommentRangeEnd(a.id));
            children.push(new CommentReference(a.id));
          }
        }
        globalStart = runEnd;
      }
    }

    body.push(new Paragraph({ children }));
    runs.length = 0;
  }

  function addRun(text: string, opts: Record<string, unknown>, groupIds?: string[]) {
    // 移除批注序号
    const cleaned = text.replace(COMMENT_INDICATOR_REGEX, '');
    if (cleaned.length === 0) return;
    // 完全按照官方插件 Io 函数：直接将 text 传递给 TextRun
    // 官方插件不处理末尾的 \n，直接传递给 TextRun
    // 但是为了与 fullText 的字符索引保持一致（fullText 中将 \n 替换为空格），这里需要替换
    // 注意：官方插件会将 \n 保留在文本中，但 docx 库不会自动创建段落，所以我们需要手动处理
    // 但是，为了与 fullText 的索引一致，我们需要将 \n 替换为空格
    const normalized = cleaned.replace(/\n/g, ' ');
    runs.push({ text: normalized, start: globalStart, opts, groupIds });
    globalStart += normalized.length;
  }

  function buildTable(el: CEElement): Table {
    const rows = (el.trList || []).map(
      (tr) =>
        new TableRow({
          children: (tr.tdList || []).map(
            (td) =>
              new TableCell({
                columnSpan: td.colspan ?? 1,
                rowSpan: td.rowspan ?? 1,
                children: elementsToParagraphsSimple(td.value || []),
              })
          ),
        })
    );
    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }

  function walk(elements: CEElement[]) {
    for (const el of elements) {
      if (el.strikeout) continue;
      if (el.type === 'title' && el.level != null) {
        flushPara();
        const headingLevel = HEADING_MAP[el.level] || HeadingLevel.HEADING_1;
        const headingChildren: any[] = [];
        if (Array.isArray(el.valueList)) {
          for (const child of el.valueList) {
            if (!child.strikeout) {
              headingChildren.push(convertElement(child));
            }
          }
        }
        body.push(new Paragraph({
          heading: headingLevel,
          children: headingChildren,
        }));
        continue;
      }
      if (el.type === 'list') {
        flushPara();
        const listText = cleanIndicators(el.valueList?.map((y) => y.value).join('') || '');
        const listItems = listText.split('\n').map((y, w) => {
          const prefix = !el.listStyle || el.listStyle === 'decimal' ? `${w + 1}. ` : '• ';
          return new Paragraph({
            children: [
              new TextRun({
                text: prefix + y,
              }),
            ],
          });
        });
        body.push(...listItems);
        continue;
      }
      if (Array.isArray(el.trList) && el.trList.length > 0) {
        flushPara();
        body.push(buildTable(el));
        continue;
      }
      const v = el.value;
      if (v != null) {
        // 完全按照官方插件 _i 函数的逻辑处理换行
        // 官方插件代码：/^\n/.test(c.value) && (r(), c.value = c.value.replace(/^\n/, "")), n.push(Io(c));
        // 这意味着：如果文本以 \n 开头，先创建新段落，然后移除开头的 \n，然后调用 Io(c)
        // Io 函数直接将 e.value 作为 text 传递给 TextRun（不处理末尾的 \n）
        if (v === '\n') {
          // 单独的换行符，创建空段落
          flushPara();
        } else {
          // 官方插件逻辑：如果文本以 \n 开头，先创建新段落，然后移除开头的 \n
          if (/^\n/.test(v)) {
            flushPara();
            const textWithoutLeadingNewline = v.replace(/^\n/, '');
            if (textWithoutLeadingNewline.length > 0) {
              // 官方插件直接将 text 传递给 TextRun，不处理末尾的 \n
              addRun(textWithoutLeadingNewline, runOpts(el), el.groupIds);
            }
          } else {
            // 官方插件直接将 text 传递给 TextRun，不处理末尾的 \n
            addRun(v, runOpts(el), el.groupIds);
          }
        }
      }
      if (Array.isArray(el.valueList)) walk(el.valueList);
    }
  }

  walk(arr);
  flushPara();
  return body;
}

/** 无锚点时 elements -> (Paragraph|Table)[]，用于 header/footer 和表格单元格 */
function elementsToParagraphsSimple(arr: CEElement[]): DocxBodyChild[] {
  return elementsToParagraphs(arr, { fullText: elementsToPlainText(arr), anchors: [] });
}

/** 构建并下载带批注的 docx */
export async function exportWithComments(input: ExportWithCommentsInput): Promise<void> {
  const { main, header, footer, clauseRisks, appliedRevisions, fileName, comments } = input;
  const mainArr = Array.isArray(main) ? main : [];
  const headerArr = Array.isArray(header) ? header : [];
  const footerArr = Array.isArray(footer) ? footer : [];
  const fullText = elementsToPlainText(mainArr);
  
  let anchors: Anchor[] = [];
  let commentChildren: any[] = [];
  let commentIdMap: Map<string, number> | undefined;

  // 如果有 comments 数据，且元素中包含 groupIds（说明编辑器支持导出批注关联），则优先使用
  if (comments && comments.length > 0 && hasGroupIds(mainArr)) {
    commentIdMap = new Map();
    let nextId = 1;
    comments.forEach((c) => {
      const did = nextId++;
      commentIdMap!.set(c.id, did);

      // 解析批注内容：将 \n 分割为多个 Paragraph
      const lines = c.content ? c.content.split('\n') : [''];
      const paragraphs = lines.map((line) => new Paragraph({
        children: [new TextRun({ text: line })]
      }));

      commentChildren.push({
        id: did,
        author: c.userName || 'SCAi Review',
        date: new Date(),
        children: paragraphs,
      });
    });
  } else {
    // 降级到旧逻辑
    anchors = buildAnchors(clauseRisks, appliedRevisions, fullText, mainArr);
    commentChildren = anchors.map((a) => ({
      id: a.id,
      author: 'SCAi Review',
      date: new Date(),
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: a.fixed ? '【已修复】' : '【未修复】',
              bold: true,
            }),
            new TextRun({
              text: `  序号：#${a.riskIndex}`,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: '风险说明：' + a.riskDesc })],
        }),
        new Paragraph({
          children: [new TextRun({ text: '修改意见：' + a.suggestion })],
        }),
      ],
    }));
  }

  const bodyParas = elementsToParagraphs(mainArr, { fullText, anchors, comments, commentIdMap });
  const headerParas = elementsToParagraphsSimple(headerArr);
  const footerParas = elementsToParagraphsSimple(footerArr);

  const doc = new DocxFile({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840,
            },
            margin: {
              top: 100,
              right: 100,
              bottom: 100,
              left: 100,
            },
          },
        },
        headers: { default: new Header({ children: headerParas }) },
        footers: { default: new Footer({ children: footerParas }) },
        children: bodyParas,
      },
    ],
    comments: { children: commentChildren },
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: "宋体",
            size: 24,
            color: "#000000",
          },
          paragraph: {
            spacing: {
              line: 360,
              before: 0,
              after: 0,
            },
            indent: {
              left: 0,
              right: 0,
              hanging: 0,
              firstLine: 0,
            },
          },
        },
      ],
    },
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.docx') ? fileName : fileName + '.docx';
  a.click();
  URL.revokeObjectURL(url);
}
