-- ============================================================================
-- 二次元の森 — Supabase 数据库初始化 SQL
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行
-- ============================================================================

-- 1. 作品表
CREATE TABLE IF NOT EXISTS works (
    id BIGINT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('novel', 'anime', 'manga')),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover TEXT DEFAULT '📖',
    tags TEXT[] DEFAULT '{}',
    description TEXT DEFAULT '',
    cover_bg TEXT DEFAULT 'linear-gradient(135deg,#3b3163,#1a1730)',
    rating REAL DEFAULT 0,
    episodes INTEGER,
    updated TEXT DEFAULT '新发布',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 章节表
CREATE TABLE IF NOT EXISTS chapters (
    id BIGINT PRIMARY KEY,
    work_id BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    sort_order BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 用户资料表（关联 Supabase Auth）
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    nickname TEXT DEFAULT '用户',
    avatar TEXT DEFAULT '😊',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_chapters_work_id ON chapters(work_id);
CREATE INDEX IF NOT EXISTS idx_works_type ON works(type);
CREATE INDEX IF NOT EXISTS idx_works_created ON works(created_at DESC);

-- ============================================================================
-- RLS（Row Level Security）策略
-- ============================================================================
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- works: 所有人可读，仅 admin 可写
CREATE POLICY "works_select_all" ON works FOR SELECT USING (true);
CREATE POLICY "works_insert_admin" ON works FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "works_update_admin" ON works FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "works_delete_admin" ON works FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- chapters: 所有人可读，仅 admin 可写
CREATE POLICY "chapters_select_all" ON chapters FOR SELECT USING (true);
CREATE POLICY "chapters_insert_admin" ON chapters FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "chapters_update_admin" ON chapters FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "chapters_delete_admin" ON chapters FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- profiles: 登录用户可读自己的，admin 可读全部
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 注册时自动创建 profile 的触发器
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, nickname, avatar, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)), '😊', 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则替换
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
