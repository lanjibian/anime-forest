# 🌸 二次元の森

一个以樱花夜色为主题的二次元内容展示网站，使用 GitHub Pages + Supabase 构建。

## 技术栈

- **前端**: 原生 HTML/CSS/JS，零框架
- **后端**: [Supabase](https://supabase.com)（认证 + 数据库 + API）
- **部署**: [GitHub Pages](https://pages.github.com)

## 项目结构

```
my-website/
├── index.html          # 首页（作品列表 + 搜索）
├── css/
│   └── style.css       # 全局样式
├── js/
│   └── app.js          # 核心逻辑（Supabase 客户端、认证、数据层、UI渲染）
├── pages/
│   ├── login.html      # 登录页
│   ├── register.html   # 注册页
│   ├── detail.html     # 作品详情页
│   ├── reader.html     # 阅读器
│   └── admin.html      # 管理后台
├── supabase.sql        # 数据库建表 + RLS 策略
└── README.md
```

## 🚀 部署步骤

### 第一步：创建 Supabase 项目

1. 前往 [supabase.com](https://supabase.com) 注册/登录
2. 创建一个新项目（选择离你最近的区域）
3. 进入 **SQL Editor**，粘贴 `supabase.sql` 的全部内容并执行
4. 进入 **Settings → API**，找到：
   - **Project URL**（如 `https://xxxxx.supabase.co`）
   - **anon public key**（以 `eyJ...` 开头的那一串）

### 第二步：配置前端

1. 打开 `js/app.js`，修改第 8-9 行：
   ```js
   const SUPABASE_URL = '你的 Project URL';
   const SUPABASE_KEY = '你的 anon public key';
   ```

### 第三步：推送到 GitHub

```bash
cd my-website
git init
git add .
git commit -m "初版"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 第四步：启用 GitHub Pages

1. 打开 GitHub 仓库 → **Settings → Pages**
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `main` → `/ (root)` → Save
4. 等待 1-2 分钟，访问 `https://你的用户名.github.io/你的仓库名/`

### 第五步：导入初始数据 & 设置管理员

**导入种子数据（管理员登录后才生效）：**
1. 在 Supabase Dashboard → **Table Editor** → `works` 表
2. 手动插入初始作品数据，或者启动网站后以管理员身份登录，种子数据会自动写入

**设置管理员：**
1. 在网站上注册一个普通账号
2. 进入 Supabase Dashboard → **Table Editor** → `profiles`
3. 找到你的用户，把 `role` 改为 `admin`
4. 退出重新登录，导航栏会出现「⚙️ 管理」入口

## ⚠️ 重要注意事项

- **认证确认**：默认情况下，新注册用户需要到 Supabase Dashboard → Authentication 中手动确认邮箱（或关闭邮箱确认要求）
- **关闭邮箱确认**（可选）：Supabase Dashboard → Authentication → Settings → 取消勾选 "Confirm email"
- **RLS 策略**：SQL 中已配置好行级安全策略 —— 所有人可读作品/章节，只有管理员可写入
- **`profiles` 表**：注册时由数据库触发器自动创建，前端代码不再手动插入

## 功能

- **封面图片**：上传本地图片作为作品封面（Supabase Storage）
- **文件上传**：支持上传 TXT / Epub 文件
  - TXT 上传后自动按「第X章」切割成章节，支持在线阅读
  - Epub 上传后在详情页显示下载按钮
- 📖 作品展示（小说 / 动画 / 漫画）
- 🔍 搜索与分类筛选
- 👤 用户注册登录（Supabase Auth）
- 📖 章节阅读器
- ⚙️ 管理后台（增删改作品、管理用户）
- 🌸 樱花飘落动画

### 设置 Storage Bucket

在上传功能使用前，需要在 Supabase Dashboard 中创建两个 Storage Bucket：

1. 进入 **Storage** → 点击 **New bucket**
2. 创建名为 `covers` 的 bucket（勾选 Public bucket）
3. 创建名为 `novels` 的 bucket（勾选 Public bucket）
4. 进入 **SQL Editor**，执行 `supabase.sql` 末尾 Storage 策略的注释部分（取消注释即可）
