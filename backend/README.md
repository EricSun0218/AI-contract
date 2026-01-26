# 后端服务

使用 Flask 和 python-docx 添加批注到 Word 文档。

## 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

## 运行服务

```bash
python app.py
```

服务将在 `http://localhost:8000` 启动。

## API 接口

### POST /api/add-comments

接收 docx 文件和批注数据，添加批注后返回修改后的文档。

**请求格式：**
- `docx`: 文件（multipart/form-data）
- `comments`: JSON 字符串，批注数据数组

**批注数据格式：**
```json
[
  {
    "type": "location",
    "location": "要查找的文本",
    "fixed": false,
    "riskIndex": 1,
    "riskDesc": "风险说明",
    "suggestion": "修改意见"
  },
  {
    "type": "manual",
    "content": "手动批注内容",
    "userName": "用户"
  }
]
```

**响应：**
- 成功：返回修改后的 docx 文件
- 失败：返回 JSON 错误信息
