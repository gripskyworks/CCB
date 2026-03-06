/**
 * CCB 配置
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface CCBConfig {
  // LLM 配置
  llm: {
    provider: 'openai' | 'anthropic' | 'deepseek' | 'ollama';
    apiKey?: string;
    baseUrl?: string;
    model: string;
  };
  
  // 数据库路径
  database: {
    path: string;
  };
}

const defaultConfig: CCBConfig = {
  llm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  database: {
    path: './data/ccb.db'
  }
};

export function loadConfig(): CCBConfig {
  const configPath = join(process.cwd(), 'ccb.config.json');
  
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(content);
      return { ...defaultConfig, ...userConfig };
    } catch (e) {
      console.warn('配置文件解析失败，使用默认配置');
    }
  }
  
  // 从环境变量读取
  const envConfig: Partial<CCBConfig> = {};
  
  if (process.env.OPENAI_API_KEY) {
    envConfig.llm = {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
  } else if (process.env.DEEPSEEK_API_KEY) {
    envConfig.llm = {
      provider: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat'
    };
  } else if (process.env.ANTHROPIC_API_KEY) {
    envConfig.llm = {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-haiku-20240307'
    };
  }
  
  return { ...defaultConfig, ...envConfig };
}
