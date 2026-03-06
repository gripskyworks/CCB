/**
 * CCB v05 LLM 功能测试
 */

import { loadConfig } from './config';
import { LLMService } from './llm';
import { getStore } from './data/store';
import { parseTime, formatTime, formatDuration } from './utils/time-parser';
import { v4 as uuidv4 } from 'uuid';

async function test() {
  console.log('=== CCB v05 LLM 功能测试 ===\n');
  
  const config = loadConfig();
  
  if (!config.llm.apiKey) {
    console.log('❌ 请设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY');
    process.exit(1);
  }
  
  console.log(`📡 模型: ${config.llm.model}\n`);
  
  const llm = new LLMService(config);
  const store = getStore('./data/test-llm.db');
  
  const userId = 'test_user';
  
  // 测试 1: 闲聊
  console.log('1. 闲聊测试');
  const chat1 = await llm.chatSimple('早上好！');
  console.log(`   输入: "早上好！"`);
  console.log(`   响应: ${chat1.slice(0, 100)}...\n`);
  
  // 测试 2: 创建提醒
  console.log('2. 创建提醒测试');
  const chat2 = await llm.chatSimple('提醒我明天下午3点开会');
  console.log(`   输入: "提醒我明天下午3点开会"`);
  console.log(`   响应: ${chat2}`);
  
  // 解析并创建提醒
  const reminderMatch = chat2.match(/\[CREATE_REMINDER:(\d+)\|([^\]]+)\]/);
  if (reminderMatch) {
    const timestamp = parseInt(reminderMatch[1]);
    const title = reminderMatch[2];
    store.createReminder({
      id: uuidv4(),
      userId,
      title,
      remindAt: timestamp,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log(`   ✅ 已创建提醒: ${title}, 时间: ${formatTime(timestamp)}`);
  } else {
    // 手动创建
    const parsed = parseTime('明天下午3点');
    if (parsed) {
      store.createReminder({
        id: uuidv4(),
        userId,
        title: '开会',
        remindAt: parsed.timestamp,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      console.log(`   ✅ 手动创建提醒: 开会, 时间: ${formatTime(parsed.timestamp)}`);
    }
  }
  console.log();
  
  // 测试 3: 查询提醒
  console.log('3. 查询提醒测试');
  const reminders = store.getReminders(userId, 'pending');
  console.log(`   提醒数量: ${reminders.length}`);
  reminders.forEach(r => {
    console.log(`   - ${formatTime(r.remindAt)} ${r.title}`);
  });
  console.log();
  
  // 测试 4: 存储记忆
  console.log('4. 记忆存储测试');
  const chat4 = await llm.chatSimple('记住我喜欢简洁的回复');
  console.log(`   输入: "记住我喜欢简洁的回复"`);
  console.log(`   响应: ${chat4}`);
  
  store.storeMemory({
    id: uuidv4(),
    userId,
    content: '用户喜欢简洁的回复',
    createdAt: Date.now()
  });
  console.log(`   ✅ 已存储记忆\n`);
  
  // 测试 5: 数学题
  console.log('5. 数学能力测试');
  const chat5 = await llm.chatSimple('1+1等于几？');
  console.log(`   输入: "1+1等于几？"`);
  console.log(`   响应: ${chat5}\n`);
  
  console.log('=== 测试完成 ===');
}

test().catch(console.error);
