import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Try .env.local first
dotenv.config(); // Fallback to .env

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 必须用 Service Role Key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 缺少 Supabase URL 或 Service Role Key，请检查 .env 文件");
  console.error("Required env vars:");
  console.error("  - VITE_SUPABASE_URL (or SUPABASE_URL)");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 模拟人类行为逻辑：根据时间段决定成功率
function simulateCompletion(hour: number, method: string): boolean {
  // 早晨 (6-11点): 适合长难任务 (Flowtime, 52/17)
  if (hour >= 6 && hour <= 11) {
    return ['flowtime', '52_17'].includes(method) ? Math.random() < 0.85 : Math.random() < 0.7;
  }
  // 下午 (13-16点): 容易犯困，Pomodoro 成功率较高
  if (hour >= 13 && hour <= 16) {
    return method === 'pomodoro' ? Math.random() < 0.8 : Math.random() < 0.4;
  }
  // 深夜 (22-2点): 极度疲劳，只有超短模式 (Blitz) 能成
  if (hour >= 22 || hour <= 2) {
    return method === 'blitz' ? Math.random() < 0.9 : Math.random() < 0.15;
  }
  // 其他时间随机
  return Math.random() < 0.5;
}

// 根据是否成功计算持续时间
function getDuration(method: string, completed: boolean): number {
  const targets: Record<string, number> = { 'pomodoro': 25, 'blitz': 15, '52_17': 52, 'flowtime': 45 };
  const targetMin = targets[method] || 25;
  
  if (completed) {
    // Flowtime 如果成功，可能会更长
    if (method === 'flowtime') return (targetMin + Math.floor(Math.random() * 30)) * 60;
    return targetMin * 60; 
  } else {
    // 失败意味着中途放弃
    return Math.floor(Math.random() * targetMin * 0.8) * 60; 
  }
}

async function run() {
  console.log("🤖 正在生成 AI 训练数据...");
  
  // 获取一个真实用户ID (为了绑定数据)
  const { data: users } = await supabase.auth.admin.listUsers();
  const userId = users.users[0]?.id;

  if (!userId) {
    console.error("❌ 没找到用户，请先运行 seed.ts 创建用户");
    return;
  }

  const methods = ['pomodoro', 'flowtime', 'blitz', '52_17'];
  const sessions = [];

  for (let i = 0; i < 500; i++) {
    const date = faker.date.recent({ days: 30 }); // 过去30天
    const hour = date.getHours();
    const method = faker.helpers.arrayElement(methods);
    const completed = simulateCompletion(hour, method);
    const duration = getDuration(method, completed);

    sessions.push({
      user_id: userId,
      method_used: method,
      duration_seconds: duration,
      completed,
      started_at: date.toISOString(),
    });
  }

  const { error } = await supabase.from('study_sessions').insert(sessions);
  
  if (error) console.error("插入失败:", error);
  else console.log(`✅ 成功生成 ${sessions.length} 条智能规律数据！`);
}

run();
