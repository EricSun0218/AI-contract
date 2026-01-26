# 智能合同审查系统

一个基于 AI 的智能合同审查平台，提供合同风险识别、在线编辑和批注导出功能。

## 功能特性

### 🤖 AI 智能审查
- **风险识别**：自动识别合同中的高风险和中风险条款
- **风险分析**：提供详细的风险说明和修改建议
- **智能修复**：支持一键修复多个风险点，自动应用修改建议
- **缺失条款检测**：识别合同中缺失的重要条款，并提供补充建议

### 📝 在线编辑
- **Word 风格编辑器**：基于 canvas-editor 的在线文档编辑体验
- **实时预览**：所见即所得的编辑体验
- **格式支持**：支持加粗、斜体、下划线、高亮等文本格式
- **撤销重做**：完整的撤销/重做功能

### 💬 批注系统
- **AI 批注**：自动为识别的风险点生成批注
- **手动批注**：支持用户手动添加批注
- **批注定位**：点击批注可快速定位到文档中的对应位置
- **批注导出**：导出 Word 文档时保留所有批注信息

### 📤 文档导出
- **格式保持**：导出的 Word 文档完全保持原文档格式
- **批注保留**：所有批注（AI 和手动）都会在导出的文档中保留
- **状态标记**：批注中清晰标记"已修复"或"未修复"状态

## 技术栈

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **canvas-editor** - 在线文档编辑器
- **framer-motion** - 动画库

### 后端
- **Python 3** - 后端语言
- **Flask** - Web 框架
- **python-docx** - Word 文档处理
- **Flask-CORS** - 跨域支持

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- Python >= 3.8
- npm 或 yarn

### 前端部署

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **构建生产版本**
   ```bash
   npm run build
   ```

4. **预览生产构建**
   ```bash
   npm run preview
   ```

开发服务器将在 `http://localhost:5173` 启动。

### 后端部署

1. **进入后端目录**
   ```bash
   cd backend
   ```

2. **创建虚拟环境（推荐）**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

4. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置必要的环境变量
   ```

5. **启动服务**
   ```bash
   python app.py
   # 或使用启动脚本
   chmod +x start.sh
   ./start.sh
   ```

后端服务将在 `http://localhost:8000` 启动。

### 生产环境部署

#### 前端部署

1. **构建生产版本**
   ```bash
   npm run build
   ```

2. **部署 dist 目录**
   - 将 `dist` 目录部署到静态文件服务器（如 Nginx、Apache）
   - 或使用 Vercel、Netlify 等平台部署

3. **配置环境变量**
   - 设置 `VITE_BACKEND_URL` 为后端 API 地址（如：`https://api.example.com`）

#### 后端部署

1. **使用 Gunicorn（推荐）**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:8000 app:app
   ```

2. **使用 Nginx 反向代理**
   ```nginx
   server {
       listen 80;
       server_name api.example.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **使用 Docker（可选）**
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
   ```

## 项目结构

```
AI-contract/
├── components/          # React 组件
│   ├── EditorView.tsx  # 编辑器视图
│   ├── UploadView.tsx  # 上传视图
│   ├── Sidebar.tsx     # 侧边栏
│   └── GlassUI.tsx     # UI 组件
├── utils/              # 工具函数
│   ├── exportWithComments.ts        # 批注导出
│   └── exportWithOfficialPlugin.ts  # 官方插件导出
├── backend/            # 后端服务
│   ├── app.py          # Flask 应用
│   ├── requirements.txt # Python 依赖
│   └── README.md       # 后端说明
├── types.ts            # TypeScript 类型定义
├── App.tsx             # 主应用组件
└── package.json        # 项目配置
```

## 使用说明

### 上传文档
1. 点击"上传文件"或拖拽文件到上传区域
2. 选择合同场景、审查立场和审查尺度
3. 点击"开始审查"

### 查看审查结果
- 右侧面板显示所有识别的风险点
- 可以按"全部"、"高风险"、"中风险"、"手动"筛选
- 点击风险卡片可定位到文档中的对应位置

### 应用修复
- 点击单个风险卡片的"应用修复"按钮，或使用顶部的"一键修复"按钮
- 修复后的内容会以蓝色标记显示
- 可以随时点击"撤销修复"恢复原状

### 添加手动批注
1. 在文档中选中文本
2. 点击弹出的"批注"按钮
3. 输入批注内容并提交

### 导出文档
1. 点击顶部工具栏的"导出 Word"按钮
2. 系统会自动添加所有批注到导出的 Word 文档中
3. 批注会显示在文档的对应位置

## 注意事项

### 版本说明
- **AI 审查功能**：当前为初版，AI 风险识别和分析功能正在持续优化迭代中
- **在线编辑器**：当前为初版，部分高级编辑功能正在开发中
- 系统会持续更新，带来更好的用户体验

### 浏览器兼容性
- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14

### 文件格式支持
- 支持 DOC、DOCX 格式
- PDF 格式支持有限（建议使用 DOCX）

### 性能建议
- 建议文档大小不超过 10MB
- 大型文档可能需要较长的处理时间

## 开发计划

- [ ] 增强 AI 审查准确性
- [ ] 优化在线编辑器性能
- [ ] 支持更多文档格式
- [ ] 添加协作编辑功能
- [ ] 支持批量文档处理
- [ ] 增强批注功能（回复、标记等）

## 许可证

本项目为私有项目，未经授权不得使用。

## 联系方式

如有问题或建议，请联系项目维护团队。
