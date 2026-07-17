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

## 部署步骤

### 1. Supabase 配置

1. 创建 [Supabase](https://supabase.com) 项目
2. 进入 SQL Editor，粘贴并执行 `supabase.sql`
3. 进入 Settings → API，复制 **anon public key** 和 **URL**
4. 修改 `js/app.js` 中的 `SUPABASE_URL` 和 `SUPABASE_KEY`

### 2. GitHub Pages 部署

```bash
cd my-website
git init
git add .
git commit -m "初版"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

然后在 GitHub 仓库 Settings → Pages → Source 选 `main` 分支 → Save。

### 3. 设置管理员

注册一个账号，然后在 Supabase Dashboard → Table Editor → profiles → 找到你的用户，把 `role` 改为 `admin`。

## 功能

- 📖 作品展示（小说 / 动画 / 漫画）
- 🔍 搜索与分类筛选
- 👤 用户注册登录（Supabase Auth）
- 📖 章节阅读器
- ⚙️ 管理后台（增删改作品、管理用户）
- 🌸 樱花飘落动画
