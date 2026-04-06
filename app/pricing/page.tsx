'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  plan: string;
  bonus_credits: number;
  monthly_remaining: number;
}

const PLANS = [
  {
    key: 'free',
    name: '免费版',
    price: '$0',
    period: '永久',
    credits: '3次/月',
    features: ['注册送1次', '标准分辨率', '无水印下载', '7天历史记录'],
    cta: '当前套餐',
    highlight: false,
    planKey: null,
  },
  {
    key: 'pro_monthly',
    name: 'Pro 月付',
    price: '$9.9',
    period: '/月',
    credits: '50次/月',
    features: ['每月50次去背景', '高清原图输出', '无水印下载', '永久历史记录', '批量处理'],
    cta: '立即升级',
    highlight: true,
    planKey: 'pro_monthly',
  },
  {
    key: 'pro_yearly',
    name: 'Pro 年付',
    price: '$59.9',
    period: '/年',
    credits: '50次/月',
    badge: '省$58.9',
    features: ['每月50次去背景', '高清原图输出', '无水印下载', '永久历史记录', '批量处理'],
    cta: '立即购买',
    highlight: false,
    planKey: 'pro_yearly',
  },
  {
    key: 'one_time',
    name: '一次性包',
    price: '$4.9',
    period: '一次性',
    credits: '20次',
    features: ['20次去背景', '永不过期', '标准分辨率', '无水印下载'],
    cta: '立即购买',
    highlight: false,
    planKey: 'one_time',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json() as Promise<{ user: UserInfo | null }>)
      .then(d => { setUser(d.user); setLoading(false); });

    // 检查支付结果
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      setMessage('🎉 支付成功！权益已激活');
      window.history.replaceState({}, '', '/pricing');
    } else if (params.get('cancelled') === '1') {
      setMessage('支付已取消');
      window.history.replaceState({}, '', '/pricing');
    } else if (params.get('error')) {
      setMessage(`支付失败: ${params.get('detail') || params.get('error')}`);
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  const handlePurchase = async (planKey: string) => {
    if (!user) {
      router.push('/api/auth/login');
      return;
    }
    setPaying(planKey);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json() as { approveUrl?: string; error?: string };
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        setMessage(`❌ ${data.error || '创建订单失败'}`);
        setPaying(null);
      }
    } catch {
      setMessage('❌ 网络错误，请重试');
      setPaying(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700">
      {/* 导航 */}
      <nav className="flex items-center justify-between px-6 py-4">
        <a href="/" className="text-white font-bold text-lg">✨ 图片去背景</a>
        {!loading && (
          user ? (
            <div className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl text-sm">
              {user.avatar_url && <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
              <span>{user.name?.split(' ')[0]}</span>
            </div>
          ) : (
            <a href="/api/auth/login" className="bg-white text-purple-700 px-4 py-2 rounded-xl font-semibold text-sm">
              Google 登录
            </a>
          )
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-3">选择适合你的套餐</h1>
        <p className="text-white/70 text-center mb-4">所有套餐均支持高质量去背景，由 Remove.bg 驱动</p>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-medium ${
            message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                plan.highlight ? 'ring-2 ring-purple-500 shadow-xl scale-105' : 'shadow-lg'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  最受欢迎
                </div>
              )}
              {'badge' in plan && plan.badge && (
                <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-gray-800 text-lg">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <div className="mt-1 text-purple-600 font-semibold text-sm">{plan.credits}</div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>

              {plan.planKey ? (
                <button
                  onClick={() => handlePurchase(plan.planKey!)}
                  disabled={paying === plan.planKey}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {paying === plan.planKey ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                      跳转中...
                    </span>
                  ) : plan.cta}
                </button>
              ) : (
                <div className={`w-full py-3 rounded-xl font-semibold text-sm text-center ${
                  user?.plan === 'free' || !user
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {user?.plan === 'pro' ? '已升级 Pro ✓' : plan.cta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 bg-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">常见问题</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: '支付安全吗？', a: '使用 PayPal 安全支付，我们不存储任何银行卡信息。' },
              { q: '次数什么时候重置？', a: 'Pro 套餐每月1日自动重置。一次性包次数永不过期。' },
              { q: '可以退款吗？', a: '购买后7天内如未使用可申请退款，联系客服处理。' },
              { q: '沙盒环境如何测试？', a: '使用 PayPal 沙盒测试账号，不会真实扣款。' },
            ].map(({ q, a }) => (
              <div key={q}>
                <h4 className="text-white font-semibold mb-1">{q}</h4>
                <p className="text-white/70 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-8">
          ⚠️ 当前为沙盒测试环境，不会真实扣款
        </p>
      </div>
    </main>
  );
}
