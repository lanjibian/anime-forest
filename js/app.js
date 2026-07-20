// ============================================================================
// 二次元の森 — Supabase 后端版本
// ============================================================================

// ============================
//  Supabase 初始化
// ============================
const SUPABASE_URL = 'https://hqfafrqsszlzwvdwvnjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EK9bk9rG0bS5ff3Fxolf6g_TRhCTySd';

// 用 db 做客户端变量名，避免和 CDN 的 supabase 冲突
let db = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.warn('Supabase 初始化失败:', e.message);
}

// ============================
//  用户认证
// ============================
const Auth = {
    async getUser() {
        if (!db) return null;
        try {
            const { data: { session }, error } = await db.auth.getSession();
            if (error || !session) return null;
            const { data: profile } = await db
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            // 如果 profiles 中没有记录（刚注册，trigger 还没跑完），使用默认值
            return {
                id: session.user.id,
                email: session.user.email,
                role: profile ? profile.role : 'user',
                nickname: profile ? (profile.nickname || '用户') : '用户',
                avatar: profile ? (profile.avatar || '😊') : '😊'
            };
        } catch (e) {
            console.warn('获取用户失败:', e.message);
            return null;
        }
    },

    async register(email, password, nickname) {
        if (!db) return { success: false, message: '后端服务未连接' };
        try {
            // 通过 metadata 传递 nickname，SQL trigger 会在注册时自动创建 profile
            const { data, error } = await db.auth.signUp({
                email,
                password,
                options: {
                    data: { nickname: nickname || email.split('@')[0] }
                }
            });
            if (error) {
                if (error.message.includes('already')) return { success: false, message: '该邮箱已被注册' };
                return { success: false, message: error.message };
            }
            return { success: true, message: '注册成功！请登录' };
        } catch (e) {
            return { success: false, message: '网络错误: ' + e.message };
        }
    },

    async login(email, password) {
        if (!db) return { success: false, message: '后端服务未连接' };
        try {
            const { data, error } = await db.auth.signInWithPassword({ email, password });
            if (error) return { success: false, message: '邮箱或密码错误' };
            return { success: true };
        } catch (e) {
            return { success: false, message: '网络错误: ' + e.message };
        }
    },

    async logout() {
        if (db) await db.auth.signOut();
        window.location.href = '../index.html';
    },

    async isAdmin() {
        const user = await this.getUser();
        return user && user.role === 'admin';
    }
};
window.Auth = Auth;

// ============================
//  Toast
// ============================
function showToast(msg, type) {
    type = type || 'info';
    var c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = (icons[type] || '') + ' ' + msg;
    c.appendChild(t);
    setTimeout(function () {
        t.style.opacity = '0';
        t.style.transition = 'opacity 0.3s';
        setTimeout(function () { t.remove(); }, 300);
    }, 3000);
}
window.showToast = showToast;

// ============================
//  导航栏
// ============================
async function renderNavbar() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;

    var path = window.location.pathname;
    var inPages = path.indexOf('/pages/') !== -1;
    var to = function (p) { return inPages ? p : 'pages/' + p; };
    var home = inPages ? '../index.html' : './index.html';

    var user = null;
    try { user = await Auth.getUser(); } catch (e) {}

    nav.innerHTML =
        '<a class="nav-brand" href="' + home + '">' +
            '<span class="nav-brand-icon">🌸</span>' +
            '<span>二次元の森</span>' +
        '</a>' +
        '<ul class="nav-links">' +
            '<li><a href="' + home + '">🏠 首页</a></li>' +
            (user ?
                (user.role === 'admin' ? '<li><a href="' + to('admin.html') + '">⚙️ 管理</a></li>' : '') +
                '<li class="nav-user">' +
                    '<span class="nav-user-info">' + user.avatar + ' ' + user.nickname + '</span>' +
                    '<button class="btn btn-sm btn-outline" onclick="Auth.logout()">退出</button>' +
                '</li>'
            :
                '<li><a href="' + to('login.html') + '" class="btn btn-sm btn-outline">登录</a></li>' +
                '<li><a href="' + to('register.html') + '" class="btn btn-sm btn-primary">注册</a></li>'
            ) +
        '</ul>';
}
window.renderNavbar = renderNavbar;

// ============================
//  花瓣
// ============================
function renderPetals() {
    var hero = document.querySelector('.hero');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ['🌸', '🌸', '✿', '❀'].forEach(function (g) {
        for (var j = 0; j < 4; j++) {
            var p = document.createElement('span');
            p.className = 'petal';
            p.textContent = g;
            p.style.left = Math.random() * 100 + '%';
            p.style.fontSize = (0.7 + Math.random() * 0.9) + 'rem';
            p.style.setProperty('--drift', (Math.random() - 0.5) * 160 + 'px');
            p.style.animationDuration = (7 + Math.random() * 8) + 's';
            p.style.animationDelay = '-' + Math.random() * 10 + 's';
            hero.appendChild(p);
        }
    });
}

// ============================
//  数据
// ============================
async function loadWorks() {
    if (!db) return [];
    try {
        var result = await db.from('works').select('*').order('created_at', { ascending: false });
        return result.data || [];
    } catch (e) { console.error('加载作品失败:', e); return []; }
}

async function loadChapters(workId) {
    if (!db) return [];
    try {
        var result = await db.from('chapters').select('*').eq('work_id', workId).order('sort_order', { ascending: true });
        return result.data || [];
    } catch (e) { console.error('加载章节失败:', e); return []; }
}

var TYPE_LABEL = { novel: '📖 小说', anime: '📺 动画', manga: '📚 漫画' };

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================
//  作品卡片
// ============================
function renderWorks(works) {
    var grid = document.getElementById('worksGrid');
    if (!grid) return;
    grid.className = 'works-grid';
    if (!works.length) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🍃</span><p>还没有作品哦，敬请期待~</p></div>';
        return;
    }
    grid.innerHTML = works.map(function (w) {
        return '<article class="work-card" onclick="window.location.href=\'pages/detail.html?id=' + w.id + '\'">' +
            '<div class="work-cover" style="--cover-bg:' + esc(w.cover_bg || 'linear-gradient(135deg,#3b3163,#1a1730)') + '">' + esc(w.cover || '📖') + '</div>' +
            '<div class="work-body">' +
                '<span class="work-type">' + (TYPE_LABEL[w.type] || w.type) + '</span>' +
                '<h3 class="work-title">' + esc(w.title) + '</h3>' +
                '<p class="work-author">✍️ ' + esc(w.author) + '</p>' +
                '<p class="work-desc">' + esc(w.description || '') + '</p>' +
                '<div class="work-meta"><span>★ ' + ((w.rating || 0).toFixed(1)) + '</span><span>' + esc(w.updated || '新发布') + '</span></div>' +
            '</div>' +
        '</article>';
    }).join('');
}

// ============================
//  详情页
// ============================
async function renderDetailPage() {
    var c = document.getElementById('detailContainer');
    if (!c) return;
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id) { c.innerHTML = '<p class="empty-state">作品不存在</p>'; return; }
    if (!db) { c.innerHTML = '<p class="empty-state">⚠️ 后端服务未连接</p>'; return; }

    var result = await db.from('works').select('*').eq('id', id).single();
    var work = result.data;
    if (!work) { c.innerHTML = '<p class="empty-state">作品不存在</p>'; return; }

    var chapters = await loadChapters(id);
    c.innerHTML =
        '<div class="detail-header">' +
            '<div class="detail-cover" style="background:' + esc(work.cover_bg || 'linear-gradient(135deg,#3b3163,#1a1730)') + '">' + esc(work.cover || '📖') + '</div>' +
            '<div class="detail-info">' +
                '<h2>' + esc(work.title) + '</h2>' +
                '<div class="detail-meta">' +
                    '<span>✍️ ' + esc(work.author) + '</span><span>📂 ' + (TYPE_LABEL[work.type] || work.type) + '</span>' +
                    '<span>📝 ' + chapters.length + '话</span>' + (work.episodes ? '<span>📺 ' + work.episodes + '集</span>' : '') +
                    '<span>★ ' + ((work.rating || 0).toFixed(1)) + '</span>' +
                '</div>' +
                '<div class="detail-tags">' + (work.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
                '<p class="detail-desc">' + esc(work.description || '') + '</p>' +
            '</div>' +
        '</div>' +
        '<div class="card chapter-card">' +
            '<h3 class="card-title">📑 章节列表</h3>' +
            '<ul class="chapter-list">' +
                (chapters.length ?
                    chapters.map(function (ch) {
                        return '<li onclick="window.location.href=\'reader.html?work=' + id + '&chapter=' + ch.id + '\'">' + esc(ch.title) + '</li>';
                    }).join('')
                : '<li style="color:var(--ink-400);cursor:default">暂无章节</li>') +
            '</ul>' +
        '</div>';
}
window.renderDetailPage = renderDetailPage;

// ============================
//  阅读器
// ============================
async function renderReader() {
    var c = document.getElementById('readerContainer');
    if (!c) return;
    var p = new URLSearchParams(window.location.search);
    var wid = p.get('work'), cid = p.get('chapter');
    if (!wid || !cid) { c.innerHTML = '<p class="empty-state">参数错误</p>'; return; }
    if (!db) { c.innerHTML = '<p class="empty-state">⚠️ 后端服务未连接</p>'; return; }

    var wRes = await db.from('works').select('*').eq('id', wid).single();
    var cRes = await db.from('chapters').select('*').eq('id', cid).single();
    var work = wRes.data, chapter = cRes.data;
    if (!work || !chapter) { c.innerHTML = '<p class="empty-state">内容不存在</p>'; return; }

    var chapters = await loadChapters(wid);
    var idx = -1;
    for (var i = 0; i < chapters.length; i++) { if (chapters[i].id == cid) { idx = i; break; } }
    var prev = idx > 0 ? chapters[idx - 1] : null;
    var next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

    c.innerHTML =
        '<div class="reader">' +
            '<h2 class="reader-title">' + esc(chapter.title) + '</h2>' +
            '<div class="reader-content">' + (chapter.content || '').replace(/\n/g, '<br>') + '</div>' +
            '<div class="reader-nav">' +
                '<span>' + (prev ? '<button class="btn btn-outline btn-sm" onclick="window.location.href=\'reader.html?work=' + wid + '&chapter=' + prev.id + '\'">← ' + esc(prev.title) + '</button>' : '') + '</span>' +
                '<button class="btn btn-outline btn-sm" onclick="window.location.href=\'detail.html?id=' + wid + '\'">📑 目录</button>' +
                '<span>' + (next ? '<button class="btn btn-outline btn-sm" onclick="window.location.href=\'reader.html?work=' + wid + '&chapter=' + next.id + '\'">' + esc(next.title) + ' →</button>' : '') + '</span>' +
            '</div>' +
        '</div>';
}
window.renderReader = renderReader;

// ============================
//  管理后台
// ============================
async function renderAdminWorks(search) {
    var ct = document.getElementById('adminWorksList');
    if (!ct) return;
    var ws = await loadWorks();
    if (search) {
        var q = search.toLowerCase();
        ws = ws.filter(function (w) { return w.title.toLowerCase().indexOf(q) !== -1 || w.author.toLowerCase().indexOf(q) !== -1; });
    }
    var tl = { novel: '📖小说', anime: '📺动画', manga: '📚漫画' };
    if (ws.length === 0) {
        ct.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>暂无作品</p></div>';
        return;
    }
    ct.innerHTML = '<table class="admin-table"><thead><tr><th>作品</th><th>类型</th><th>作者</th><th>操作</th></tr></thead><tbody>' +
        ws.map(function (w) {
            return '<tr><td>' + esc(w.cover) + ' ' + esc(w.title) + '</td><td>' + (tl[w.type] || w.type) + '</td><td>' + esc(w.author) + '</td>' +
                '<td><button class="btn btn-sm btn-primary" onclick="editWork(' + w.id + ')">✏️</button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteWork(' + w.id + ')">🗑️</button></td></tr>';
        }).join('') + '</tbody></table>';
}
window.renderAdminWorks = renderAdminWorks;

async function renderAdminUsers() {
    var ct = document.getElementById('adminUsersList');
    if (!ct || !db) return;
    var result = await db.from('profiles').select('*').order('created_at', { ascending: false });
    var users = result.data;
    if (!users || users.length === 0) {
        ct.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>暂无用户</p></div>';
        return;
    }
    ct.innerHTML = '<table class="admin-table"><thead><tr><th>用户</th><th>角色</th><th>注册时间</th><th>操作</th></tr></thead><tbody>' +
        users.map(function (u) {
            return '<tr><td>' + esc(u.avatar || '😊') + ' ' + esc(u.nickname || '用户') +
                ' <span class="text-muted">' + esc((u.username || u.id).substring(0, 20)) + '</span></td>' +
                '<td>' + (u.role === 'admin' ? '👑管理员' : '👤用户') + '</td>' +
                '<td>' + (u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-') + '</td>' +
                '<td><button class="btn btn-sm btn-outline" onclick="toggleUserRole(\'' + u.id + '\')">切换角色</button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteUser(\'' + u.id + '\')">🗑️</button></td></tr>';
        }).join('') + '</tbody></table>';
}
window.renderAdminUsers = renderAdminUsers;

async function updateChapterWorkSelect() {
    var s = document.getElementById('chapterWorkSelect');
    if (!s) return;
    var ws = await loadWorks();
    s.innerHTML = '<option value="">请选择作品</option>' + ws.map(function (w) { return '<option value="' + w.id + '">' + esc(w.cover) + ' ' + esc(w.title) + '</option>'; }).join('');
}
window.updateChapterWorkSelect = updateChapterWorkSelect;

async function loadChaptersForAdmin() {
    var s = document.getElementById('chapterWorkSelect'), ct = document.getElementById('chapterListAdmin');
    if (!s || !ct) return;
    var wid = s.value;
    document.getElementById('chapterWorkId').value = wid || '';
    if (!wid) { ct.innerHTML = '<p class="text-muted">请选择一个作品</p>'; return; }
    var chs = await loadChapters(wid);
    ct.innerHTML = chs.length > 0
        ? '<p style="font-weight:600;margin-bottom:8px;color:var(--ink-200)">已有章节：</p><ul class="chapter-list">' +
            chs.map(function (ch) {
                return '<li style="display:flex;justify-content:space-between;align-items:center"><span>' + esc(ch.title) + '</span>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteChapter(' + wid + ',' + ch.id + ')">🗑️</button></li>';
            }).join('') + '</ul>'
        : '<p class="text-muted">该作品暂无章节</p>';
}
window.loadChaptersForAdmin = loadChaptersForAdmin;

async function editWork(id) {
    var result = await db.from('works').select('*').eq('id', id).single();
    var w = result.data;
    if (!w) return;
    document.getElementById('editWorkId').value = w.id;
    document.getElementById('editWorkTitle').value = w.title;
    document.getElementById('editWorkAuthor').value = w.author;
    document.getElementById('editWorkTags').value = (w.tags || []).join(', ');
    document.getElementById('editWorkDesc').value = w.description || '';
    document.getElementById('editModal').classList.add('show');
}
window.editWork = editWork;

function closeEditModal() { document.getElementById('editModal').classList.remove('show'); }
window.closeEditModal = closeEditModal;

async function deleteWork(id) {
    if (!confirm('确定删除此作品？章节也会被删除。')) return;
    await db.from('works').delete().eq('id', id);
    showToast('作品已删除', 'info');
    renderAdminWorks(); updateChapterWorkSelect();
}
window.deleteWork = deleteWork;

async function deleteChapter(wid, cid) {
    if (!confirm('确定删除此章节？')) return;
    await db.from('chapters').delete().eq('id', cid);
    showToast('章节已删除', 'info');
    loadChaptersForAdmin();
}
window.deleteChapter = deleteChapter;

async function deleteUser(id) {
    if (!confirm('确定删除此用户？此操作不可恢复。')) return;
    try {
        // 尝试调用 Edge Function（如果已部署），否则降级到仅删除 profiles
        await db.functions.invoke('admin-delete-user', { body: { user_id: id } });
    } catch (e) {
        // 降级：仅从 profiles 删除（auth.users 中的记录需要在 Supabase Dashboard 中手动删除）
        console.warn('Edge Function 未部署，仅删除 profiles 记录');
        await db.from('profiles').delete().eq('id', id);
    }
    showToast('用户已删除', 'info');
    renderAdminUsers();
}
window.deleteUser = deleteUser;

async function toggleUserRole(id) {
    var result = await db.from('profiles').select('role').eq('id', id).single();
    var u = result.data;
    if (!u) return;
    var nr = u.role === 'admin' ? 'user' : 'admin';
    await db.from('profiles').update({ role: nr }).eq('id', id);
    showToast('角色已变为' + (nr === 'admin' ? '管理员' : '普通用户'), 'success');
    renderAdminUsers();
}
window.toggleUserRole = toggleUserRole;

// ============================
//  初始示例数据
// ============================
async function seedData() {
    if (!db) return;
    // 只有管理员才能写入种子数据（避免 RLS 拒绝普通用户的 INSERT）
    var isAdmin = false;
    try { isAdmin = await Auth.isAdmin(); } catch (e) {}
    if (!isAdmin) return;  // 非管理员：只读浏览，不尝试写入

    var check = await db.from('works').select('id').limit(1);
    if (check.data && check.data.length > 0) return;

    var works = [
        { id: 1, type: 'novel', title: '夜行猫与流星伞', author: '柊 千夜', cover: '🐱', tags: ['治愈', '奇幻', '日常'], description: '一只会说话的黑猫，带着捡来的伞，在下雨的城市里寻找回家的路。', cover_bg: 'linear-gradient(135deg,#3b3163,#1a1730)', rating: 4.8, updated: '更新至 3 话' },
        { id: 2, type: 'novel', title: '边境的钟表匠', author: '水無月 蒼', cover: '⏰', tags: ['奇幻', '冒险', '温情'], description: '在被时间遗忘的小镇上，钟表匠与迷路的旅人共同修复一座停摆的巨钟。', cover_bg: 'linear-gradient(135deg,#d1478f,#3b3163)', rating: 4.9, updated: '连载中' },
        { id: 3, type: 'manga', title: '纸伞下的怪谈铺', author: '桔梗 灯里', cover: '👻', tags: ['怪谈', '悬疑', '治愈'], description: '专门收购奇怪故事的小铺子，每一个来客都带着一段不可思议的过往。', cover_bg: 'linear-gradient(135deg,#e8bd77,#3b3163)', rating: 4.6, updated: '更新至 18 卷' },
        { id: 4, type: 'anime', title: '星海图书馆的看守人', author: '天野 灯', cover: '🌟', tags: ['科幻', '治愈', '文艺'], description: '在漂浮于宇宙中的图书馆里，看守人负责为每一本孤独的书找到读者。', cover_bg: 'linear-gradient(135deg,#2a2448,#120f1e)', rating: 4.7, updated: '已完结', episodes: 24 },
        { id: 5, type: 'anime', title: '放学后的结界部', author: '百目鬼 澪', cover: '🎭', tags: ['校园', '奇幻', '热血'], description: '三个平凡的高中生意外接手了守护校园结界的任务。', cover_bg: 'linear-gradient(135deg,#ef6bab,#2a2448)', rating: 4.5, updated: '连载中' },
        { id: 6, type: 'manga', title: '旧书堂的猫店长', author: '小鹿 白', cover: '📚', tags: ['日常', '萌系', '治愈'], description: '一间快要倒闭的旧书店，因为一只神秘的猫而重新热闹起来。', cover_bg: 'linear-gradient(135deg,#f4d9a8,#3b3163)', rating: 4.9, updated: '更新至 9 卷' }
    ];
    var chapters = [
        { id: 101, work_id: 1, title: '第一章：雨夜的相遇', content: '那天晚上的雨下得很大。\n\n黑猫蹲在路灯下，雨水顺着它光滑的毛发滑落。一把被遗弃的透明伞被风吹到了它的脚边。\n\n"这把伞，借我用一下吧。"黑猫自言自语地说着，用尾巴卷起了伞柄。\n\n在霓虹灯闪烁的城市里，一只撑着伞的黑猫，开始了它的旅程。', sort_order: 1 },
        { id: 102, work_id: 1, title: '第二章：流星划过', content: '城市的高楼之间，一颗流星悄然划过。\n\n黑猫停下了脚步，抬头望向天空。那把透明的伞在星光下闪烁着微光。\n\n"听说，对着流星许愿的话，愿望就会实现。"\n\n它闭上眼睛，默默地许下了一个愿望——找到回家的路。', sort_order: 2 },
        { id: 103, work_id: 1, title: '第三章：伞下的约定', content: '在一个老旧的书店门口，黑猫遇到了一个小女孩。\n\n"你的伞真漂亮。"小女孩说。\n\n黑猫把伞递给了她："送给你吧，我已经不需要了。"\n\n因为，它已经找到了回家的路——那个有温暖灯光和书香的地方。', sort_order: 3 },
        { id: 201, work_id: 2, title: '第一章：停摆的钟塔', content: '在这个被时间遗忘的小镇，最大的那座钟塔已经停摆了整整十年。\n\n没有人记得它为什么停，也没有人在意。\n\n直到有一天，一个背着工具箱的年轻人走进了小镇。\n\n"我能修好它。"他说。', sort_order: 1 },
        { id: 202, work_id: 2, title: '第二章：齿轮之歌', content: '钟塔内部，成千上万个齿轮静静地沉睡。\n\n年轻人轻轻拂去灰尘，开始一个一个地修复。叮叮当当的声音像是一首歌，在小镇上空回荡。\n\n镇民们纷纷走出家门，抬头望向那座钟塔——这是十年来，他们第一次认真看它。', sort_order: 2 },
        { id: 301, work_id: 3, title: '第1话：第一个客人', content: '【漫画区域】\n\n"欢迎光临，纸伞下的怪谈铺。"\n\n门口的风铃响了。进来的是一个面色苍白的少女，她手中紧紧攥着一面旧镜子。\n\n"请问...这里收购故事吗？"\n\n店主微微一笑："当然，请坐。"', sort_order: 1 },
        { id: 401, work_id: 4, title: '第1话：宇宙中的图书馆', content: '在银河系的边缘，漂浮着一座巨大的图书馆。\n\n没有人知道它存在了多久，就像没有人知道宇宙从何时开始。\n\n看守人是一个看起来只有十几岁的少年，他每天的工作就是整理书籍，等待着偶尔到访的"读者"。\n\n今天，图书馆的门铃响了——时隔百年。', sort_order: 1 },
        { id: 501, work_id: 5, title: '第1话：结界的裂缝', content: '放学后的教室，夕阳将一切都染成了金色。\n\n"喂，你们看到那个了吗？"班长指着窗外的天空——一道黑色的裂缝正在缓缓蔓延。\n\n这就是传说中的"结界裂缝"？三个高中生面面相觑。\n\n他们的普通日常，从这一刻起彻底改变了。', sort_order: 1 },
        { id: 601, work_id: 6, title: '第1话：猫来了', content: '【漫画区域】\n\n旧书堂的生意一天比一天差。店主大叔叹了口气："再这样下去，只能关门了。"\n\n就在这时，一只橘色的猫从窗户跳了进来，嘴里叼着一张纸条。\n\n纸条上写着："我来当店长吧。"\n\n从此，旧书堂的故事开启了新的篇章。', sort_order: 1 }
    ];
    await db.from('works').upsert(works, { onConflict: 'id' });
    await db.from('chapters').upsert(chapters, { onConflict: 'id' });
}

// ============================
//  主初始化
// ============================
document.addEventListener('DOMContentLoaded', function () {
    renderNavbar();

    var worksGrid = document.getElementById('worksGrid');
    if (worksGrid) {
        (async function () {
            var allWorks = [];
            if (db) {
                await seedData();
                allWorks = await loadWorks();
            }
            renderWorks(allWorks);

            var keyword = '', typeFilter = '';
            function filter() {
                return allWorks.filter(function (w) {
                    var mt = typeFilter ? w.type === typeFilter : true;
                    var kw = keyword.trim().toLowerCase();
                    var mk = kw ? (w.title.toLowerCase().indexOf(kw) !== -1 || w.author.toLowerCase().indexOf(kw) !== -1 || (w.tags || []).some(function (t) { return t.toLowerCase().indexOf(kw) !== -1; })) : true;
                    return mt && mk;
                });
            }

            var searchInput = document.getElementById('searchInput');
            var searchBtn = document.getElementById('searchBtn');
            if (searchBtn) searchBtn.addEventListener('click', function () { keyword = searchInput.value; renderWorks(filter()); });
            if (searchInput) searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { keyword = searchInput.value; renderWorks(filter()); } });

            document.querySelectorAll('.cat-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('.cat-btn').forEach(function (b) { b.classList.remove('active'); });
                    this.classList.add('active');
                    typeFilter = this.dataset.type || '';
                    renderWorks(filter());
                });
            });
        })();
        renderPetals();
    }

    // 登录
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var email = document.getElementById('loginEmail').value.trim();
            var pw = document.getElementById('loginPassword').value;
            if (!email || !pw) { showToast('请填写完整信息', 'warning'); return; }
            var r = await Auth.login(email, pw);
            if (r.success) {
                showToast('登录成功！', 'success');
                setTimeout(async function () {
                    var u = await Auth.getUser();
                    window.location.href = (u && u.role === 'admin') ? 'admin.html' : '../index.html';
                }, 500);
            } else { showToast(r.message, 'error'); }
        });
    }

    // 注册
    var regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var email = document.getElementById('regEmail').value.trim();
            var pw = document.getElementById('regPassword').value;
            var cf = document.getElementById('regConfirmPassword').value;
            var nn = document.getElementById('regNickname').value.trim();
            if (!email || !pw || !cf) { showToast('请填写完整信息', 'warning'); return; }
            if (pw.length < 6) { showToast('密码至少6位', 'warning'); return; }
            if (pw !== cf) { showToast('两次密码不一致', 'error'); return; }
            var r = await Auth.register(email, pw, nn);
            if (r.success) { showToast(r.message, 'success'); setTimeout(function () { window.location.href = 'login.html'; }, 1500); }
            else { showToast(r.message, 'error'); }
        });
    }

    // 详情 / 阅读器
    renderDetailPage();
    renderReader();

    // 管理后台
    var sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        (async function () {
            var isAdmin = await Auth.isAdmin();
            if (!isAdmin) { showToast('请先以管理员身份登录', 'error'); setTimeout(function () { window.location.href = 'login.html'; }, 1500); return; }
            renderAdminWorks(); renderAdminUsers(); updateChapterWorkSelect();

            sidebar.querySelectorAll('.menu-item').forEach(function (item) {
                item.addEventListener('click', function () {
                    sidebar.querySelectorAll('.menu-item').forEach(function (i) { i.classList.remove('active'); });
                    this.classList.add('active');
                    var panel = this.dataset.panel;
                    ['works', 'addWork', 'users'].forEach(function (p) {
                        var el = document.getElementById('panel-' + p);
                        if (el) el.style.display = p === panel ? 'block' : 'none';
                    });
                    if (panel === 'works') renderAdminWorks();
                    if (panel === 'users') renderAdminUsers();
                    if (panel === 'addWork') updateChapterWorkSelect();
                });
            });

            var addWorkForm = document.getElementById('addWorkForm');
            if (addWorkForm) addWorkForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var type = document.getElementById('workType').value;
                var title = document.getElementById('workTitle').value.trim();
                var author = document.getElementById('workAuthor').value.trim();
                var cover = document.getElementById('workCover').value.trim() || '📖';
                var tags = document.getElementById('workTags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
                var desc = document.getElementById('workDesc').value.trim();
                if (!type || !title || !author || !tags.length || !desc) { showToast('请填写完整信息', 'warning'); return; }
                var result = await db.from('works').insert([{ id: Date.now(), type: type, title: title, author: author, cover: cover, tags: tags, description: desc, cover_bg: 'linear-gradient(135deg,#3b3163,#1a1730)', rating: 0, updated: '新发布' }]);
                if (result.error) { showToast('创建失败: ' + result.error.message, 'error'); return; }
                showToast('✅ 作品创建成功！', 'success');
                this.reset(); updateChapterWorkSelect(); renderAdminWorks();
            });

            var addChapterForm = document.getElementById('addChapterForm');
            if (addChapterForm) addChapterForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var wid = parseInt(document.getElementById('chapterWorkId').value);
                var title = document.getElementById('chapterTitle').value.trim();
                var content = document.getElementById('chapterContent').value.trim();
                if (!wid || !title || !content) { showToast('请填写完整信息', 'warning'); return; }
                var result = await db.from('chapters').insert([{ id: Date.now(), work_id: wid, title: title, content: content, sort_order: Date.now() }]);
                if (result.error) { showToast('添加失败: ' + result.error.message, 'error'); return; }
                showToast('✅ 章节添加成功！', 'success');
                document.getElementById('chapterTitle').value = ''; document.getElementById('chapterContent').value = ''; loadChaptersForAdmin();
            });

            var adminSearch = document.getElementById('adminSearch');
            if (adminSearch) adminSearch.addEventListener('input', function () { renderAdminWorks(this.value.trim()); });

            var editWorkForm = document.getElementById('editWorkForm');
            if (editWorkForm) editWorkForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var id = parseInt(document.getElementById('editWorkId').value);
                var title = document.getElementById('editWorkTitle').value.trim();
                var author = document.getElementById('editWorkAuthor').value.trim();
                var tags = document.getElementById('editWorkTags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
                var desc = document.getElementById('editWorkDesc').value.trim();
                await db.from('works').update({ title: title, author: author, tags: tags, description: desc }).eq('id', id);
                showToast('✅ 作品已更新！', 'success');
                closeEditModal(); renderAdminWorks(); updateChapterWorkSelect();
            });
        })();
    }

    console.log(db ? '✅ 二次元の森已就绪 (Supabase 模式)' : '⚠️ Supabase 未连接');
});
