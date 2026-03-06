/**
 * CCB 数据模型定义
 * 基于 CCB v0 设计文档
 */

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  content?: string;
  remindAt: number; // Unix timestamp
  status: 'pending' | 'notified' | 'completed' | 'expired';
  recurrence?: RecurrenceRule;
  createdAt: number;
  updatedAt: number;
}

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: number;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  keywords?: string[];
  embedding?: number[];
  createdAt: number;
}

export interface AIBehaviorLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  timestamp: number;
}
