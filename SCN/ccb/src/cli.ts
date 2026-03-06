/**
 * CCB v05 CLI 入口
 * 简化版 - 直接调用 CCB 插件逻辑
 */

import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { ccbPlugin } from './plugins/ccb-plugin';
import { getStore } from './data/store';

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
  console.log('输入 "exit" 或 "quit" 退出\n');

  // 初始化数据存储
  getStore('./data/ccb.db');

  console.log('✅ CCB 已就绪，开始对话吧！\n');

  // 获取 CCB actions
  const actions = ccbPlugin.actions || [];

  // 主循环
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
      // 创建消息
      const message = {
        id: uuidv4(),
        entityId: 'user_cli',
        roomId: 'default',
        content: { text: input },
        createdAt: Date.now()
      };

      // 尝试匹配 action
      let handled = false;
      
      for (const action of actions) {
        const isValid = await action.validate({} as any, message as any);
        
        if (isValid) {
          // 收集响应
          let responseText = '';
          const callback = async (response: any) => {
            responseText = response.text;
            return [];
          };

          await action.handler({} as any, message as any, undefined, undefined, callback);
          
          if (responseText) {
            console.log(`\nCCB: ${responseText}\n`);
            handled = true;
            break;
          }
        }
      }

      if (!handled) {
        // 通用回复
        const responses = [
          '我明白了。如果你需要设置提醒或记录什么，随时告诉我。',
          '收到！需要我帮你设置提醒吗？',
          '好的，有什么我可以帮你的吗？比如设置提醒或记住什么？',
          '嗯嗯。记得告诉我如果需要提醒或记录什么哦~'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        console.log(`\nCCB: ${randomResponse}\n`);
      }
    } catch (error) {
      console.error('处理出错:', error);
      console.log('\nCCB: 抱歉，出了点问题。请再说一次？\n');
    }
  }
}

main().catch(console.error);
