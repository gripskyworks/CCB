/**
 * CCB v05 功能测试
 */

import { getStore } from './data/store';
import { parseTime, formatTime, formatDuration } from './utils/time-parser';
import { ccbPlugin } from './plugins/ccb-plugin';
import { v4 as uuidv4 } from 'uuid';

async function test() {
  console.log('=== CCB v05 功能测试 ===\n');

  // 初始化
  const store = getStore('./data/test-ccb.db');
  const actions = ccbPlugin.actions || [];

  // 测试1: 时间解析
  console.log('1. 时间解析测试');
  const timeTests = [
    '明天下午3点',
    '三天后',
    '下周一上午10点',
    '后天晚上8点'
  ];
  
  for (const test of timeTests) {
    const result = parseTime(test);
    if (result) {
      console.log(`  "${test}" -> ${formatTime(result.timestamp)} (${formatDuration(result.timestamp)})`);
    } else {
      console.log(`  "${test}" -> 解析失败`);
    }
  }

  // 测试2: 提醒创建
  console.log('\n2. 提醒创建测试');
  const reminderAction = actions.find(a => a.name === 'reminder_create');
  if (reminderAction) {
    const message = {
      id: uuidv4(),
      entityId: 'test_user',
      content: { text: '提醒我明天下午3点开会' },
      createdAt: Date.now()
    };

    let response = '';
    const callback = async (res: any) => {
      response = res.text;
      return [];
    };

    await reminderAction.handler({} as any, message as any, undefined, undefined, callback);
    console.log(`  输入: "${message.content.text}"`);
    console.log(`  响应: ${response.replace(/\n/g, '\\n')}`);
  }

  // 测试3: 提醒查询
  console.log('\n3. 提醒查询测试');
  const queryAction = actions.find(a => a.name === 'reminder_query');
  if (queryAction) {
    const message = {
      id: uuidv4(),
      entityId: 'test_user',
      content: { text: '我有什么提醒' },
      createdAt: Date.now()
    };

    let response = '';
    const callback = async (res: any) => {
      response = res.text;
      return [];
    };

    await queryAction.handler({} as any, message as any, undefined, undefined, callback);
    console.log(`  输入: "${message.content.text}"`);
    console.log(`  响应: ${response.replace(/\n/g, '\\n')}`);
  }

  // 测试4: 记忆存储
  console.log('\n4. 记忆存储测试');
  const memoryAction = actions.find(a => a.name === 'memory_store');
  if (memoryAction) {
    const message = {
      id: uuidv4(),
      entityId: 'test_user',
      content: { text: '记住我喜欢简洁的回复' },
      createdAt: Date.now()
    };

    let response = '';
    const callback = async (res: any) => {
      response = res.text;
      return [];
    };

    await memoryAction.handler({} as any, message as any, undefined, undefined, callback);
    console.log(`  输入: "${message.content.text}"`);
    console.log(`  响应: ${response}`);
  }

  // 测试5: 自我回顾
  console.log('\n5. 自我回顾测试');
  const reviewAction = actions.find(a => a.name === 'self_review');
  if (reviewAction) {
    const message = {
      id: uuidv4(),
      entityId: 'test_user',
      content: { text: '你刚才做了什么' },
      createdAt: Date.now()
    };

    let response = '';
    const callback = async (res: any) => {
      response = res.text;
      return [];
    };

    await reviewAction.handler({} as any, message as any, undefined, undefined, callback);
    console.log(`  输入: "${message.content.text}"`);
    console.log(`  响应: ${response.replace(/\n/g, '\\n')}`);
  }

  // 验证数据
  console.log('\n6. 数据验证');
  const reminders = store.getReminders('test_user');
  console.log(`  提醒数量: ${reminders.length}`);
  
  const memories = store.getRecentMemories('test_user');
  console.log(`  记忆数量: ${memories.length}`);
  
  const behaviors = store.getRecentBehaviors('test_user', 10);
  console.log(`  行为日志数量: ${behaviors.length}`);

  console.log('\n=== 测试完成 ===');
  
  store.close();
}

test().catch(console.error);
