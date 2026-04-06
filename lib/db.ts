// lib/db.ts - D1 数据库操作封装

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  google_id: string | null;
  plan: 'free' | 'pro' | 'one_time';
  plan_expires_at: number | null;
  bonus_credits: number;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

const PLAN_LIMITS = {
  free: 3,       // 3次/月
  pro: 50,       // 50次/月
  one_time: 0,   // 用 bonus_credits
};

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  return result || null;
}

export async function getUserByGoogleId(db: D1Database, googleId: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE google_id = ?').bind(googleId).first<User>();
  return result || null;
}

export async function createUser(db: D1Database, data: {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  google_id: string;
}): Promise<User> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    'INSERT INTO users (id, email, name, avatar_url, google_id, plan, bonus_credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, "free", 1, ?, ?)'
  ).bind(data.id, data.email, data.name, data.avatar_url, data.google_id, now, now).run();
  return getUserById(db, data.id) as Promise<User>;
}

export async function getOrCreateUser(db: D1Database, googleProfile: {
  sub: string;
  email: string;
  name: string;
  picture: string;
}): Promise<User> {
  let user = await getUserByGoogleId(db, googleProfile.sub);
  if (!user) {
    const id = crypto.randomUUID();
    user = await createUser(db, {
      id,
      email: googleProfile.email,
      name: googleProfile.name,
      avatar_url: googleProfile.picture,
      google_id: googleProfile.sub,
    });
  }
  return user;
}

// 检查用量并决定是否允许
export async function checkAndConsumeCredit(
  db: D1Database,
  userId: string | null,
  ip: string
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = now.toISOString().slice(0, 10);

  // 未登录：IP限制 1次/天
  if (!userId) {
    const row = await db.prepare(
      'SELECT used_count FROM ip_daily_usage WHERE ip = ? AND date = ?'
    ).bind(ip, today).first<{ used_count: number }>();

    const count = row?.used_count || 0;
    if (count >= 1) {
      return { allowed: false, reason: 'ip_limit' };
    }
    await db.prepare(
      'INSERT INTO ip_daily_usage (ip, date, used_count) VALUES (?, ?, 1) ON CONFLICT(ip, date) DO UPDATE SET used_count = used_count + 1'
    ).bind(ip, today).run();
    return { allowed: true, remaining: 0 };
  }

  // 已登录：获取用户信息
  const user = await getUserById(db, userId);
  if (!user) return { allowed: false, reason: 'user_not_found' };

  // 优先消耗 bonus_credits（注册赠送 + 一次性包）
  if (user.bonus_credits > 0) {
    const now_ts = Math.floor(Date.now() / 1000);
    await db.prepare(
      'UPDATE users SET bonus_credits = bonus_credits - 1, updated_at = ? WHERE id = ?'
    ).bind(now_ts, userId).run();
    return { allowed: true, remaining: user.bonus_credits - 1 };
  }

  // Pro 用户：50次/月
  if (user.plan === 'pro') {
    const proExpired = user.plan_expires_at && user.plan_expires_at < Math.floor(Date.now() / 1000);
    if (proExpired) {
      // Pro 过期，降回 free
      await db.prepare('UPDATE users SET plan = "free", updated_at = ? WHERE id = ?')
        .bind(Math.floor(Date.now() / 1000), userId).run();
    } else {
      const usage = await getOrCreateMonthlyUsage(db, userId, yearMonth);
      if (usage >= 50) {
        return { allowed: false, reason: 'pro_limit', remaining: 0 };
      }
      await incrementMonthlyUsage(db, userId, yearMonth);
      return { allowed: true, remaining: 50 - usage - 1 };
    }
  }

  // Free 用户：3次/月
  const usage = await getOrCreateMonthlyUsage(db, userId, yearMonth);
  if (usage >= 3) {
    return { allowed: false, reason: 'free_limit', remaining: 0 };
  }
  await incrementMonthlyUsage(db, userId, yearMonth);
  return { allowed: true, remaining: 3 - usage - 1 };
}

async function getOrCreateMonthlyUsage(db: D1Database, userId: string, yearMonth: string): Promise<number> {
  const row = await db.prepare(
    'SELECT used_count FROM monthly_usage WHERE user_id = ? AND year_month = ?'
  ).bind(userId, yearMonth).first<{ used_count: number }>();
  return row?.used_count || 0;
}

async function incrementMonthlyUsage(db: D1Database, userId: string, yearMonth: string): Promise<void> {
  await db.prepare(
    'INSERT INTO monthly_usage (user_id, year_month, used_count) VALUES (?, ?, 1) ON CONFLICT(user_id, year_month) DO UPDATE SET used_count = used_count + 1'
  ).bind(userId, yearMonth).run();
}

export async function getUserMonthlyUsage(db: D1Database, userId: string): Promise<number> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getOrCreateMonthlyUsage(db, userId, yearMonth);
}

// Session 管理
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30天
  const createdAt = Math.floor(Date.now() / 1000);
  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, userId, expiresAt, createdAt).run();
  return sessionId;
}

export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ?'
  ).bind(sessionId, Math.floor(Date.now() / 1000)).first<Session>();
  return session || null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}
