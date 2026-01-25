/**
 * 自建 Word 导出：将 canvas-editor 的 getValue().data 转为 docx，并注入批注。
 * 转换规则与 @hufe921/canvas-editor-plugin-docx 的 _i/Io 对齐，以保持与「导出 Word」一致的格式；
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
};

export interface ExportWithCommentsInput {
  main: CEElement[];
  header?: CEElement[];
  footer?: CEElement[];
  clauseRisks: ClauseRisk[];
  appliedRevisions: Set<string>;
  fileName: string;
}

/** 从元素树收集纯文本（用于定位），与 elementsToParagraphs 的 addRun 一致：\n 作空格 */
function elementsToPlainText(arr: CEElement[]): string {
  let s = '';
  for (const el of arr) {
    if (el.strikeout) continue;
    if (el.value != null) s += el.value.replace(/\n/g, ' ');
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

/** 取元素的 run 样式（用于 TextRun），与 docx 插件的 Io 一致 */
function runOpts(el: CEElement): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (el.bold) o.bold = true;
  if (el.italic) o.italics = true;
  if (el.font) o.font = el.font;
  o.size = `${(el.size ?? 16) / 0.75}pt`;
  o.color = toHex(el.color);
  if (el.underline) o.underline = { type: 'single' as const };
  if (el.highlight) o.highlight = toHex(el.highlight);
  if (el.type === 'superscript') o.superScript = true;
  if (el.type === 'subscript') o.subScript = true;
  return o;
}

interface Anchor {
  id: number;
  start: number;
  end: number;
  fixed: boolean;
  riskDesc: string;
  suggestion: string;
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
      if (!fixed) {
        const tit = findTitle();
        if (tit != null) {
          anchors.push({ id: ++id, start: tit.start, end: tit.start + tit.length, fixed: false, riskDesc, suggestion });
        }
      } else {
        const rev = findRevisionStart(clause.revision);
        if (rev) {
          anchors.push({ id: ++id, start: rev.start, end: rev.start + rev.len, fixed: true, riskDesc, suggestion });
        }
      }
      continue;
    }

    for (const rp of clause.risks) {
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
        });
      }
    }
  }

  return anchors;
}

type DocxBodyChild = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;

/** 将元素转为 docx (Paragraph|Table)[]，与插件 _i 对齐；在段落内按 anchors 注入 CommentRange*。 */
function elementsToParagraphs(
  arr: CEElement[],
  opts: { fullText: string; anchors: Anchor[] }
): DocxBodyChild[] {
  const { fullText, anchors } = opts;
  const body: DocxBodyChild[] = [];
  const runs: { text: string; start: number; opts: Record<string, unknown> }[] = [];
  let globalStart = 0;

  function flushPara() {
    if (runs.length === 0) {
      body.push(new Paragraph({ text: '' }));
      return;
    }
    const children: (InstanceType<typeof TextRun> | CommentRangeStart | CommentRangeEnd | CommentReference)[] = [];
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

      for (let i = 0; i < points.length - 1; i++) {
        const p = points[i];
        const q = points[i + 1];
        const segText = fullText.substring(p, q);
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
    body.push(new Paragraph({ children }));
    runs.length = 0;
  }

  function addRun(text: string, opts: Record<string, unknown>) {
    const t = text.replace(/\n/g, ' ');
    if (t.length === 0) return;
    runs.push({ text: t, start: globalStart, opts });
    globalStart += t.length;
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
      if (Array.isArray(el.trList) && el.trList.length > 0) {
        flushPara();
        body.push(buildTable(el));
        continue;
      }
      const v = el.value;
      if (v != null) {
        if (v === '\n' || /^\n+/.test(v)) {
          flushPara();
          const rest = v.replace(/^\n+/, '');
          if (rest) addRun(rest, runOpts(el));
        } else {
          addRun(v, runOpts(el));
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
  const { main, header, footer, clauseRisks, appliedRevisions, fileName } = input;
  const mainArr = Array.isArray(main) ? main : [];
  const headerArr = Array.isArray(header) ? header : [];
  const footerArr = Array.isArray(footer) ? footer : [];
  const fullText = elementsToPlainText(mainArr);
  const anchors = buildAnchors(clauseRisks, appliedRevisions, fullText, mainArr);

  const bodyParas = elementsToParagraphs(mainArr, { fullText, anchors });
  const headerParas = elementsToParagraphsSimple(headerArr);
  const footerParas = elementsToParagraphsSimple(footerArr);

  // docx 的 Comments 会对每项执行 new Comment(child)，故这里传 ICommentOptions 普通对象，不能传 Comment 实例
  const commentChildren = anchors.map((a) => ({
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

  const doc = new DocxFile({
    sections: [
      {
        headers: { default: new Header({ children: headerParas }) },
        footers: { default: new Footer({ children: footerParas }) },
        children: bodyParas,
      },
    ],
    comments: { children: commentChildren },
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.docx') ? fileName : fileName + '.docx';
  a.click();
  URL.revokeObjectURL(url);
}
