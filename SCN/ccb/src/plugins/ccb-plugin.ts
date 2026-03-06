/**
 * CCB 插件 - 核心功能实现
 * 基于 ElizaOS 插件架构
 */

import { v4 as uuidv4 } from 'uuid';
import type { Plugin, Action, IAgentRuntime, Memory, State, Content } from '@elizaos/core';
import { getStore } from '../data/store';
import { parseTime, formatTime, formatDuration } from '../utils/time-parser';
import type { Reminder, AIBehaviorLog } from '../data/schema';

// 提醒创建 Action
const reminderCreateAction: Action = {
  name: 'reminder_create',
  description: '创建一个新的提醒。当用户说"提醒我..."、"记一下..."、"别忘了..."时使用。',
  similes: ['set_reminder', 'create_reminder', 'add_reminder'],
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('提醒') || text.includes('记') || text.includes('别忘了');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: (response: Content) => Promise<Memory[]>
  ) => {
    const text = message.content.text || '';
    const userId = message.entityId || 'default';
    const store = getStore();

    // 尝试提取时间
    const parsedTime = parseTime(text);
    
    if (!parsedTime) {
      // 没有识别到时间，询问
      if (callback) {
        await callback({
          text: '好的，你希望我什么时候提醒你呢？比如"明天下午3点"或"周五上午"？',
          actions: ['WAIT_FOR_INPUT']
        });
      }
      return { text: '需要确认时间' };
    }

    // 提取提醒内容（去掉时间部分）
    let content = text.replace(parsedTime.text, '').trim();
    content = content
      .replace(/^(提醒我?|记一下?|别忘了?|帮我记|帮我提醒)/, '')
      .trim();

    if (!content) {
      content = '提醒';
    }

    // 创建提醒
    const reminder: Reminder = {
      id: uuidv4(),
      userId,
      title: content,
      remindAt: parsedTime.timestamp,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    store.createReminder(reminder);

    // 记录行为
    store.logBehavior({
      id: uuidv4(),
      userId,
      action: 'reminder_create',
      description: `创建了提醒：${content}，时间：${formatTime(reminder.remindAt)}`,
      timestamp: Date.now()
    });

    const response = `好的，我已经设置了提醒！\n\n📝 **${content}**\n⏰ ${formatTime(reminder.remindAt)}（${formatDuration(reminder.remindAt)}）`;

    if (callback) {
      await callback({ text: response });
    }

    return { text: response, reminder };
  }
};

// 提醒查询 Action
const reminderQueryAction: Action = {
  name: 'reminder_query',
  description: '查询用户的提醒列表。当用户问"有什么提醒"、"我的提醒"、"接下来有什么事"时使用。',
  similes: ['list_reminders', 'get_reminders', 'show_reminders'],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('提醒') && (text.includes('什么') || text.includes('有') || text.includes('列表') || text.includes('查询'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: (response: Content) => Promise<Memory[]>
  ) => {
    const userId = message.entityId || 'default';
    const store = getStore();

    const reminders = store.getReminders(userId, 'pending');
    const now = Date.now();

    if (reminders.length === 0) {
      const response = '目前没有待处理的提醒。需要我帮你设置一个吗？';
      if (callback) {
        await callback({ text: response });
      }
      return { text: response };
    }

    // 按时间分组
    const today = reminders.filter(r => {
      const d = new Date(r.remindAt);
      return d.toDateString() === new Date().toDateString();
    });
    
    const upcoming = reminders.filter(r => r.remindAt > now && !today.includes(r));

    let response = `📋 **你的提醒列表**\n\n`;
    
    if (today.length > 0) {
      response += `**今天**\n`;
      today.forEach(r => {
        const time = new Date(r.remindAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        response += `- ${time} ${r.title}\n`;
      });
      response += '\n';
    }

    if (upcoming.length > 0) {
      response += `**即将到来**\n`;
      upcoming.slice(0, 5).forEach(r => {
        response += `- ${formatTime(r.remindAt)} ${r.title}\n`;
      });
    }

    response += `\n共 ${reminders.length} 个提醒`;

    if (callback) {
      await callback({ text: response });
    }

    return { text: response, reminders };
  }
};

// 记忆存储 Action
const memoryStoreAction: Action = {
  name: 'memory_store',
  description: '存储重要信息到记忆。当用户说"记住..."、"别忘了..."、"我的...是..."时使用。',
  similes: ['save_memory', 'remember'],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('记住') || text.includes('我的') && text.includes('是');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: (response: Content) => Promise<Memory[]>
  ) => {
    const text = message.content.text || '';
    const userId = message.entityId || 'default';
    const store = getStore();

    // 提取记忆内容
    let content = text
      .replace(/^(记住|记得|别忘了)/, '')
      .replace(/^(我的|我)/, '')
      .trim();

    if (!content) {
      if (callback) {
        await callback({ text: '你想让我记住什么呢？' });
      }
      return { text: '需要记忆内容' };
    }

    // 存储记忆
    store.storeMemory({
      id: uuidv4(),
      userId,
      content,
      createdAt: Date.now()
    });

    // 记录行为
    store.logBehavior({
      id: uuidv4(),
      userId,
      action: 'memory_store',
      description: `记住了：${content}`,
      timestamp: Date.now()
    });

    const response = `好的，我记住了：${content}`;

    if (callback) {
      await callback({ text: response });
    }

    return { text: response, memory: content };
  }
};

// 自我回顾 Action
const selfReviewAction: Action = {
  name: 'self_review',
  description: '回顾 AI 最近的行为。当用户问"你刚才做了什么"、"你帮我做了什么"时使用。',
  similes: ['what_did_you_do', 'recent_actions'],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('你') && (text.includes('做了什么') || text.includes('刚才') || text.includes('帮我'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: (response: Content) => Promise<Memory[]>
  ) => {
    const userId = message.entityId || 'default';
    const store = getStore();

    const behaviors = store.getRecentBehaviors(userId, 5);

    if (behaviors.length === 0) {
      const response = '最近没有特别的操作记录。';
      if (callback) {
        await callback({ text: response });
      }
      return { text: response };
    }

    let response = `📝 **最近我帮你做的事**\n\n`;
    behaviors.forEach(b => {
      const time = new Date(b.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      response += `${time} - ${b.description}\n`;
    });

    if (callback) {
      await callback({ text: response });
    }

    return { text: response, behaviors };
  }
};

// 导出 CCB 插件
export const ccbPlugin: Plugin = {
  name: 'ccb',
  description: 'CCB 智能提醒与记忆系统 - 对话式生物钟助手',
  
  actions: [
    reminderCreateAction,
    reminderQueryAction,
    memoryStoreAction,
    selfReviewAction
  ]
};

export default ccbPlugin;
