'use client';

import { useState, useCallback, useEffect } from 'react';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  plan: 'free' | 'pro' | 'one_time';
  bonus_credits: number;
  monthly_used: number;
  monthly_limit: number;
  monthly_remaining: number;
}

export default function Home() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needUpgrade, setNeedUpgrade] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json() as Promise<{ user: UserInfo | null }>)
      .then((d) => { setUser(d.user); setUserLoading(false); })
      .catch(() => setUserLoading(false));
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('请选择图片文件'); return; }
    if (file.size > 12 * 1024 * 1024) { setError('图片不能超过 12MB'); return; }
    setSelectedFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    setResultUrl('');
    setError('');
    setNeedUpgrade(false);
    setCreditsRemaining(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleProcess = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    setNeedUpgrade(false);

    try {
      const form = new FormData();
      form.append('image', selectedFile);
      const res = await fetch('/api/remove-bg', { method: 'POST', body: form });

      if (res.status === 429) {
        const d = await res.json() as { error?: string; reason?: string };
        setError(d.error || '额度已用完');
        setNeedUpgrade(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error || '处理失败');
      }

      const remaining = res.headers.get('X-Credits-Remaining');
      if (remaining !== null) setCreditsRemaining(Number(remaining));

      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));

      // 刷新用户信息
      fetch('/api/auth/me').then(r => r.json() as Promise<{ user: UserInfo | null }>).then(d => setUser(d.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setOriginalUrl('');
    setResultUrl('');
    setError('');
    setNeedUpgrade(false);
    setCreditsRemaining(null);
  };

  const getTotalRemaining = () => {
    if (!user) return null;
    return user.bonus_credits + user.monthly_remaining;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700 flex flex-col">
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="text-white font-bold text-lg">✨ 图片去背景</div>
        {!userLoading && (
          user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all text-sm"
              >
                {user.avatar_url && (
                  <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span>{user.name?.split(' ')[0]}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {user.plan === 'pro' ? 'Pro' : user.plan === 'one_time' ? '套餐' : '免费'}
                </span>
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/login"
              className="flex items-center gap-2 bg-white text-purple-700 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-white/90 transition-all shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google 登录
            </a>
          )
        )}
      </nav>

      {/* 个人中心面板 */}
      {showDashboard && user && (
        <div className="mx-auto w-full max-w-2xl px-4 mb-4">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              {user.avatar_url && (
                <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full border-4 border-purple-100" />
              )}
              <div>
                <div className="font-bold text-gray-800 text-lg">{user.name}</div>
                <div className="text-gray-400 text-sm">{user.email}</div>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  user.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                  user.plan === 'one_time' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {user.plan === 'pro' ? '⭐ Pro' : user.plan === 'one_time' ? '📦 套餐' : '免费版'}
                </span>
              </div>
            </div>

            {/* 用量统计 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">{user.bonus_credits}</div>
                <div className="text-xs text-gray-500 mt-1">赠送余额</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-indigo-700">
                  {user.plan === 'one_time' ? '-' : user.monthly_used}
                </div>
                <div className="text-xs text-gray-500 mt-1">本月已用</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{getTotalRemaining()}</div>
                <div className="text-xs text-gray-500 mt-1">剩余次数</div>
              </div>
            </div>

            {/* 进度条（仅非一次性包用户） */}
            {user.plan !== 'one_time' && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>本月用量</span>
                  <span>{user.monthly_used} / {user.monthly_limit} 次</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (user.monthly_used / user.monthly_limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {user.plan === 'free' && (
                <button className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all">
                  升级 Pro — $9.9/月（50次）
                </button>
              )}
              <a
                href="/api/auth/logout"
                className="px-4 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-all text-center"
              >
                退出登录
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 主内容 */}
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">✨ 图片去背景</h1>
          <p className="text-center text-gray-400 text-sm mb-2">一键去除图片背景，由 Remove.bg 提供支持</p>

          {/* 额度提示 */}
          {!userLoading && (
            <div className="text-center mb-6">
              {user ? (
                <span className="text-xs text-gray-400">
                  剩余次数：<span className="font-semibold text-purple-600">{getTotalRemaining()} 次</span>
                  {user.plan === 'free' && ' · 免费版 3次/月'}
                  {user.plan === 'pro' && ' · Pro 50次/月'}
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  未登录每天1次 · <a href="/api/auth/login" className="text-purple-500 hover:underline">登录</a>每月3次
                </span>
              )}
            </div>
          )}

          {/* 上传区 */}
          {!selectedFile && (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <div className="text-5xl mb-3">🖼️</div>
              <p className="text-gray-600">拖拽图片到这里，或者<span className="text-purple-600 font-semibold">点击选择</span></p>
              <p className="text-gray-300 text-xs mt-2">支持 JPG、PNG、WebP，最大 12MB</p>
              <input id="fileInput" type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {/* 预览 */}
          {selectedFile && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[{ label: '原图', url: originalUrl }, { label: '去背景后', url: resultUrl }].map(({ label, url }) => (
                <div key={label}>
                  <div
                    className="rounded-xl overflow-hidden aspect-square flex items-center justify-center"
                    style={{ background: 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 0 0 / 16px 16px' }}
                  >
                    {url
                      ? <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
                      : <span className="text-gray-300 text-sm">{loading && label === '去背景后' ? '处理中…' : '待处理'}</span>
                    }
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className={`mt-4 p-3 rounded-xl text-sm text-center ${needUpgrade ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-500'}`}>
              {needUpgrade ? '⚠️ ' : '❌ '}{error}
              {needUpgrade && !user && (
                <> · <a href="/api/auth/login" className="underline font-semibold">立即登录</a></>
              )}
              {needUpgrade && user && user.plan === 'free' && (
                <> · <button className="underline font-semibold">升级 Pro</button></>
              )}
            </div>
          )}

          {creditsRemaining !== null && !error && (
            <p className="text-xs text-gray-400 text-center mt-3">剩余次数：{creditsRemaining}</p>
          )}

          {/* 操作按钮 */}
          <div className="mt-6 space-y-3">
            {selectedFile && !resultUrl && (
              <button
                onClick={handleProcess}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    处理中…
                  </>
                ) : '🚀 开始去背景'}
              </button>
            )}

            {resultUrl && (
              <a
                href={resultUrl}
                download="no-bg.png"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-white font-semibold text-base text-center block hover:opacity-90 transition-all"
              >
                ⬇️ 下载 PNG
              </a>
            )}

            {selectedFile && (
              <button onClick={reset} className="w-full text-gray-400 text-sm underline hover:text-gray-600 transition-colors">
                重新选择
              </button>
            )}
          </div>

          {/* 功能对比 */}
          {!selectedFile && (
            <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-lg mb-1">🆓</div>
                <div className="font-semibold text-gray-700">免费版</div>
                <div className="mt-1">3次/月</div>
                <div>注册送1次</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                <div className="text-lg mb-1">⭐</div>
                <div className="font-semibold text-purple-700">Pro $9.9/月</div>
                <div className="mt-1">50次/月</div>
                <div>高清原图</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-lg mb-1">📦</div>
                <div className="font-semibold text-blue-700">套餐 $4.9</div>
                <div className="mt-1">20次</div>
                <div>永不过期</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
