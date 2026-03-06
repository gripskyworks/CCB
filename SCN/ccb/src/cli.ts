/**
 * CCB v05 CLI 入口
 * 接入真正的 LLM API
 */

import readline from 'readline';
import { loadConfig } from './config';
import { LLMService, Message } from './llm';
import { getStore } from './data/store';
import { parseTime, formatTime, formatDuration } from './utils/time-parser';
import { v4 as uuidv4 } from 'uuid';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🤖 CCB v05 - 辰流机器人');
  console.log('对话式智能提醒助手\n');
  
  // 加载配置
  const config = loadConfig();
  
  if (!config.llm.apiKey) {
    console.log('❌ 未配置 API Key！请设置环境变量：');
    console.log('   OPENAI_API_KEY=xxx bun start');
    console.log('   或创建 ccb.config.json 文件\n');
    rl.close();
    process.exit(1);
  }
  
  console.log(`📡 使用模型: ${config.llm.model}`);
  console.log('输入 "exit" 或 "quit" 退出\n');
  
  // 初始化服务
  const llm = new LLMService(config);
  const store = getStore(config.database.path);
  
  // 对话历史
  const history: Message[] = [];
  
  console.log('✅ CCB 已就绪，开始对话吧！\n');

  while (true) {
    const input = await question('你: ');
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('\n再见！记得按时完成你的提醒哦~');
      rl.close();
      process.exit(0);
    }

    if (!input.trim()) {
      continue;
    }

    try {
      // 添加用户消息到历史
      history.push({ role: 'user', content: input });
      
      // 调用 LLM
      let response = '';
      process.stdout.write('\nCCB: ');
      
      response = await llm.chat(history, (text) => {
        process.stdout.write(text);
      });
      
      console.log('\n');
      
      // 解析并执行特殊操作
      response = await processActions(response, store, 'user_cli');
      
      // 添加助手回复到历史
      history.push({ role: 'assistant', content: response });
      
      // 保持历史在合理长度
      if (history.length > 20) {
        history.splice(0, 2);
      }
      
    } catch (error: any) {
      console.error('\n❌ 错误:', error.message || error);
      console.log('请检查 API Key 和网络连接\n');
      // 移除失败的消息
      history.pop();
    }
  }
}

/**
 * 处理 LLM 响应中的特殊操作标记
 */
async function processActions(response: string, store: ReturnType<typeof getStore>, userId: string): Promise<string> {
  let cleanResponse = response;
  
  // 处理创建提醒
  const reminderMatch = response.match(/\[CREATE_REMINDER:([^\|]+)\|([^\]]+)\]/);
  if (reminderMatch) {
    let timestamp = parseInt(reminderMatch[1]);
    const title = reminderMatch[2];
    
    // 如果不是有效时间戳，尝试解析
    if (isNaN(timestamp) || timestamp < 1000000000000) {
      const parsed = parseTime(reminderMatch[1]);
      if (parsed) {
        timestamp = parsed.timestamp;
      } else {
        // 尝试从原始输入解析
        timestamp = Date.now() + 86400000; // 默认明天
      }
    }
    
    const timeInfo = `${formatTime(timestamp)}（${formatDuration(timestamp)}）`;
    
    store.createReminder({
      id: uuidv4(),
      userId,
      title,
      remindAt: timestamp,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    store.logBehavior({
      id: uuidv4(),
      userId,
      action: 'create_reminder',
      description: `创建了提醒：${title}，时间：${timeInfo}`,
      timestamp: Date.now()
    });
    
    // 移除标记，保留自然语言部分
    cleanResponse = cleanResponse.replace(reminderMatch[0], '').trim();
  }
  
  // 处理查询提醒
  if (response.includes('[QUERY_REMINDERS]')) {
    const reminders = store.getReminders(userId, 'pending');
    
    store.logBehavior({
      id: uuidv4(),
      userId,
      action: 'query_reminders',
      description: `查询了提醒列表，共 ${reminders.length} 个`,
      timestamp: Date.now()
    });
    
    cleanResponse = cleanResponse.replace('[QUERY_REMINDERS]', '').trim();
    
    // 添加提醒列表到响应
    if (reminders.length > 0) {
      const reminderList = '\n\n📋 **你的提醒列表**\n\n' + reminders.map(r => 
        `- ${formatTime(r.remindAt)} ${r.title}`
      ).join('\n') + `\n\n共 ${reminders.length} 个提醒`;
      cleanResponse += reminderList;
    }
  }
  
  // 处理存储记忆
  const memoryMatch = response.match(/\[STORE_MEMORY:([^\]]+)\]/);
  if (memoryMatch) {
    const content = memoryMatch[1];
    
    store.storeMemory({
      id: uuidv4(),
      userId,
      content,
      createdAt: Date.now()
    });
    
    store.logBehavior({
      id: uuidv4(),
      userId,
      action: 'store_memory',
      description: `记住了：${content}`,
      timestamp: Date.now()
    });
    
    cleanResponse = cleanResponse.replace(memoryMatch[0], '').trim();
  }
  
  // 处理自我回顾
  if (response.includes('[REVIEW_BEHAVIORS]')) {
    const behaviors = store.getRecentBehaviors(userId, 5);
    
    store.logBehavior({
      id: uuidv4(),
      userId,
      action: 'review_behaviors',
      description: '查看了最近的行为记录',
      timestamp: Date.now()
    });
    
    cleanResponse = cleanResponse.replace('[REVIEW_BEHAVIORS]', '').trim();
    
    if (behaviors.length > 0) {
      const behaviorList = '\n\n📝 **最近我帮你做的事**\n\n' + behaviors.map(b =>
        `- ${formatTime(b.timestamp)} ${b.description}`
      ).join('\n');
      cleanResponse += behaviorList;
    }
  }
  
  return cleanResponse || response;
}

main().catch(console.error);
