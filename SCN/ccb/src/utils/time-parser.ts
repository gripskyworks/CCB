/**
 * 时间解析引擎
 * 支持中文时间表达
 */

import * as chrono from 'chrono-node';

export interface ParsedTime {
  text: string;           // 原始文本
  timestamp: number;      // Unix timestamp (毫秒)
  datetime: Date;         // Date 对象
  confidence: number;     // 置信度 0-1
}

// 中文时间表达式解析
function parseChineseTime(text: string, referenceDate: Date = new Date()): ParsedTime | null {
  const now = referenceDate;
  let datetime = new Date(now);
  let matched = false;
  let matchedText = '';

  // 今天/明天/后天 + 时间
  const dayMatch = text.match(/(今天|明天|后天|大后天)(?:下午|上午|晚上|早上|傍晚)?(\d{1,2})[点时:：](\d{0,2})?分?|(今天|明天|后天|大后天)(?:下午|上午|晚上|早上|傍晚)/);
  
  if (dayMatch) {
    const dayWord = dayMatch[1] || dayMatch[4];
    const hour = dayMatch[2] ? parseInt(dayMatch[2]) : null;
    const minute = dayMatch[3] ? parseInt(dayMatch[3]) : 0;
    
    // 处理相对日期
    if (dayWord === '今天') {
      // 不变
    } else if (dayWord === '明天') {
      datetime.setDate(datetime.getDate() + 1);
    } else if (dayWord === '后天') {
      datetime.setDate(datetime.getDate() + 2);
    } else if (dayWord === '大后天') {
      datetime.setDate(datetime.getDate() + 3);
    }
    
    // 处理时间段
    const periodMatch = text.match(/(下午|晚上|傍晚)/);
    let periodHour = 0;
    if (periodMatch) {
      periodHour = 12; // 下午加12小时
    }
    
    if (hour !== null) {
      datetime.setHours(hour + periodHour, minute, 0, 0);
    } else {
      // 只有时间段，默认时间
      if (periodMatch) {
        if (periodMatch[1] === '下午') {
          datetime.setHours(14, 0, 0, 0);
        } else if (periodMatch[1] === '晚上') {
          datetime.setHours(19, 0, 0, 0);
        } else if (periodMatch[1] === '傍晚') {
          datetime.setHours(17, 0, 0, 0);
        }
      }
    }
    
    matched = true;
    matchedText = dayMatch[0];
  }

  // N天后/周后/月后
  const relativeMatch = text.match(/(\d{1,2})\s*(天|周|星期|月)后/);
  if (relativeMatch && !matched) {
    const num = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    
    if (unit === '天') {
      datetime.setDate(datetime.getDate() + num);
    } else if (unit === '周' || unit === '星期') {
      datetime.setDate(datetime.getDate() + num * 7);
    } else if (unit === '月') {
      datetime.setMonth(datetime.getMonth() + num);
    }
    
    matched = true;
    matchedText = relativeMatch[0];
  }

  // N天/周/月后 (支持简写)
  const relativeMatch2 = text.match(/(\d{1,2})\s*(天|周|星期|月)(?=[^后]|$)/);
  if (relativeMatch2 && !matched) {
    const num = parseInt(relativeMatch2[1]);
    const unit = relativeMatch2[2];
    
    if (unit === '天') {
      datetime.setDate(datetime.getDate() + num);
    } else if (unit === '周' || unit === '星期') {
      datetime.setDate(datetime.getDate() + num * 7);
    } else if (unit === '月') {
      datetime.setMonth(datetime.getMonth() + num);
    }
    
    matched = true;
    matchedText = relativeMatch2[0];
  }

  // 下周X
  const weekMatch = text.match(/下周([一二三四五六日天])/);
  if (weekMatch && !matched) {
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0
    };
    const targetDay = dayMap[weekMatch[1]];
    const currentDay = datetime.getDay();
    const daysUntil = (7 - currentDay + targetDay) % 7 || 7;
    datetime.setDate(datetime.getDate() + daysUntil);
    
    matched = true;
    matchedText = weekMatch[0];
  }

  // 纯时间 (15:30, 3点)
  const timeMatch = text.match(/(\d{1,2})[点时:：](\d{1,2})?分?|(下午|晚上)(\d{1,2})[点时]?/);
  if (timeMatch && !matched) {
    let hour = parseInt(timeMatch[1] || timeMatch[4]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    
    // 下午/晚上
    if (timeMatch[3]) {
      if (hour < 12) hour += 12;
    }
    
    datetime.setHours(hour, minute, 0, 0);
    matched = true;
    matchedText = timeMatch[0];
  }

  if (!matched) {
    return null;
  }

  return {
    text: matchedText,
    timestamp: datetime.getTime(),
    datetime,
    confidence: 0.9
  };
}

export function parseTime(text: string, referenceDate: Date = new Date()): ParsedTime | null {
  // 先尝试中文解析
  const chineseResult = parseChineseTime(text, referenceDate);
  if (chineseResult) {
    return chineseResult;
  }

  // 回退到 chrono-node (英文)
  const results = chrono.parse(text, referenceDate, { forwardDate: true });
  
  if (results.length === 0) {
    return null;
  }

  const result = results[0];
  const datetime = result.start.date();
  
  return {
    text: result.text,
    timestamp: datetime.getTime(),
    datetime,
    confidence: result.start.isCertain('hour') ? 0.9 : 0.7
  };
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((dateOnly.getTime() - nowOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (diffDays === 0) {
    return `今天 ${timeStr}`;
  } else if (diffDays === 1) {
    return `明天 ${timeStr}`;
  } else if (diffDays === 2) {
    return `后天 ${timeStr}`;
  } else if (diffDays === -1) {
    return `昨天 ${timeStr}`;
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

export function formatDuration(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff < 0) {
    return '已过期';
  }
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天后`;
  } else if (hours > 0) {
    return `${hours}小时后`;
  } else if (minutes > 0) {
    return `${minutes}分钟后`;
  } else {
    return '即将';
  }
}
