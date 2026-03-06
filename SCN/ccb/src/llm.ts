/**
 * LLM 服务封装
 */

import OpenAI from 'openai';
import type { CCBConfig } from './config';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMService {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;
  
  constructor(config: CCBConfig) {
    this.client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseUrl
    });
    this.model = config.llm.model;
    
    this.systemPrompt = `你是 CCB（辰流机器人），一个智能提醒助手。

## 核心能力
1. **创建提醒**: 用户说"提醒我..."时，识别时间和内容
2. **查询提醒**: 用户问"有什么提醒"时，列出提醒
3. **记忆存储**: 用户说"记住..."时，存储信息
4. **自我回顾**: 用户问"你做了什么"时，回顾行为

## 性格特点
- 简洁友好，不啰嗦
- 温和细心，有条理
- 直接回答问题

## 响应格式
当需要执行操作时，在回复末尾添加特殊标记（自然语言回复在前）：

### 创建提醒
[CREATE_REMINDER:时间戳|标题]
时间戳必须是 Unix 毫秒时间戳数字！
当前时间戳: ${Date.now()}
例如：[CREATE_REMINDER:${Date.now() + 86400000}|开会]

### 查询提醒
[QUERY_REMINDERS]

### 存储记忆
[STORE_MEMORY:内容]
例如：[STORE_MEMORY:用户喜欢简洁的回复]

### 自我回顾
[REVIEW_BEHAVIORS]

如果用户只是闲聊，正常回复即可，不需要特殊标记。

## 示例
用户: 提醒我明天下午3点开会
你: 好的，已设置提醒！明天下午3点提醒你开会。[CREATE_REMINDER:${Date.now() + 86400000}|开会]

用户: 1+1等于几？
你: 1+1等于2。`;
  }
  
  async chat(messages: Message[], onStream?: (text: string) => void): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ],
      stream: true
    });
    
    let fullContent = '';
    
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      if (onStream && content) {
        onStream(content);
      }
    }
    
    return fullContent;
  }
  
  async chatSimple(userMessage: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });
    
    return response.choices[0]?.message?.content || '';
  }
}
