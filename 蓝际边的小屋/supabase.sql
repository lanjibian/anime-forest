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
    cover_url TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    description TEXT DEFAULT '',
    cover_bg TEXT DEFAULT 'linear-gradient(135deg,#94C2E8,#345891)',
    rating REAL DEFAULT 0,
    episodes INTEGER,
    file_url TEXT DEFAULT '',
    file_type TEXT DEFAULT '',
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
-- 清理旧策略（如果之前执行过旧版 SQL，先删掉避冲突）
-- ============================================================================
DROP POLICY IF EXISTS "works_select_all" ON works;
DROP POLICY IF EXISTS "works_insert_admin" ON works;
DROP POLICY IF EXISTS "works_update_admin" ON works;
DROP POLICY IF EXISTS "works_delete_admin" ON works;
DROP POLICY IF EXISTS "chapters_select_all" ON chapters;
DROP POLICY IF EXISTS "chapters_insert_admin" ON chapters;
DROP POLICY IF EXISTS "chapters_update_admin" ON chapters;
DROP POLICY IF EXISTS "chapters_delete_admin" ON chapters;
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

-- ============================================================================
-- 辅助函数：检查当前用户是否为管理员（避免 RLS 递归）
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- ============================================================================
-- RLS（Row Level Security）策略
-- ============================================================================
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- works: 所有人可读，仅 admin 可写
CREATE POLICY "works_select_all" ON works FOR SELECT USING (true);
CREATE POLICY "works_insert_admin" ON works FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "works_update_admin" ON works FOR UPDATE USING (is_admin());
CREATE POLICY "works_delete_admin" ON works FOR DELETE USING (is_admin());

-- chapters: 所有人可读，仅 admin 可写
CREATE POLICY "chapters_select_all" ON chapters FOR SELECT USING (true);
CREATE POLICY "chapters_insert_admin" ON chapters FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "chapters_update_admin" ON chapters FOR UPDATE USING (is_admin());
CREATE POLICY "chapters_delete_admin" ON chapters FOR DELETE USING (is_admin());

-- profiles: 登录用户可读自己的，admin 可读全部、可更新全部
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE USING (is_admin());

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

-- ============================================================================
-- Storage Bucket & 策略（封面图片 + 小说文件）
-- ============================================================================
-- 在 Supabase Dashboard → SQL Editor 中执行以下命令创建 bucket，
-- 或者通过 Supabase 网页 UI 手动创建 'covers' 和 'novels' 两个 bucket（Public）。
-- 然后执行以下策略：

-- 封面 bucket 策略（所有人可读，登录用户可上传）
-- Bucket 名称: covers
-- CREATE POLICY "covers_select_all" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
-- CREATE POLICY "covers_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
-- CREATE POLICY "covers_delete_admin" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 小说文件 bucket 策略（所有人可读，登录用户可上传）
-- Bucket 名称: novels
-- CREATE POLICY "novels_select_all" ON storage.objects FOR SELECT USING (bucket_id = 'novels');
-- CREATE POLICY "novels_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'novels' AND auth.role() = 'authenticated');
-- CREATE POLICY "novels_delete_admin" ON storage.objects FOR DELETE USING (bucket_id = 'novels' AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
