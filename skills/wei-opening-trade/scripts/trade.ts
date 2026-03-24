/**
 * Wei Opening Trade - Core Analysis Module
 *
 * 开盘交易决策分析的核心功能模块
 * 包含：股票信息提取、交易时段判断、分析提示词构建等功能
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 股票信息接口
 */
export interface StockInfo {
  name: string;
  code: string;
  market: 'a-share' | 'hk-stock';
  fullCode: string; // 带市场前缀的代码，如 sz000001, hk00700
}

/**
 * 行情数据接口
 */
export interface StockQuote {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  bid: number;
  ask: number;
  timestamp: string;
}

/**
 * 交易时段类型
 */
export type TradingSession = 'pre-market' | 'morning' | 'lunch-break' | 'afternoon' | 'closing' | 'after-hours';

/**
 * 交易时段配置
 */
export interface SessionConfig {
  name: string;
  start: string;
  end: string;
  description: string;
  analysisFocus: string[];
}

// A股交易时段配置
const A_SHARE_SESSIONS: Record<TradingSession, SessionConfig> = {
  'pre-market': {
    name: '盘前',
    start: '00:00',
    end: '09:30',
    description: '集合竞价前时段',
    analysisFocus: ['隔夜外盘表现', '期货走势', '新闻政策', '开盘预测'],
  },
  'morning': {
    name: '早盘',
    start: '09:30',
    end: '11:30',
    description: '上午连续竞价',
    analysisFocus: ['开盘质量', '成交量', '资金流向', '个股强度'],
  },
  'lunch-break': {
    name: '午休',
    start: '11:30',
    end: '13:00',
    description: '午间休市',
    analysisFocus: ['上午复盘', '下午预判', '策略调整'],
  },
  'afternoon': {
    name: '午盘',
    start: '13:00',
    end: '14:30',
    description: '下午连续竞价（尾盘前）',
    analysisFocus: ['趋势确认', '加仓时机', '量价配合'],
  },
  'closing': {
    name: '尾盘',
    start: '14:30',
    end: '15:00',
    description: '收盘前30分钟',
    analysisFocus: ['尾盘资金', '收盘预期', '隔夜持仓'],
  },
  'after-hours': {
    name: '盘后',
    start: '15:00',
    end: '23:59',
    description: '收盘后时段',
    analysisFocus: ['当日总结', '次日预判'],
  },
};

// 港股交易时段配置
const HK_STOCK_SESSIONS: Record<TradingSession, SessionConfig> = {
  'pre-market': {
    name: '盘前',
    start: '00:00',
    end: '09:30',
    description: '开市前时段',
    analysisFocus: ['隔夜美股', 'ADR表现', '期货走势', '开盘预测'],
  },
  'morning': {
    name: '早盘',
    start: '09:30',
    end: '12:00',
    description: '上午持续交易',
    analysisFocus: ['开盘质量', '成交量', '资金流向', '个股强度'],
  },
  'lunch-break': {
    name: '午休',
    start: '12:00',
    end: '13:00',
    description: '午间休市',
    analysisFocus: ['上午复盘', '下午预判', '策略调整'],
  },
  'afternoon': {
    name: '午盘',
    start: '13:00',
    end: '15:30',
    description: '下午持续交易（尾盘前）',
    analysisFocus: ['趋势确认', '加仓时机', '量价配合'],
  },
  'closing': {
    name: '尾盘',
    start: '15:30',
    end: '16:00',
    description: '收盘前30分钟',
    analysisFocus: ['尾盘资金', '收盘预期', '隔夜持仓'],
  },
  'after-hours': {
    name: '盘后',
    start: '16:00',
    end: '23:59',
    description: '收盘后时段',
    analysisFocus: ['当日总结', '次日预判'],
  },
};

/**
 * 常见股票映射表
 */
const STOCK_NAME_MAP: Record<string, { code: string; market: 'a-share' | 'hk-stock' }> = {
  '茅台': { code: '600519', market: 'a-share' },
  '贵州茅台': { code: '600519', market: 'a-share' },
  '腾讯': { code: '00700', market: 'hk-stock' },
  '腾讯控股': { code: '00700', market: 'hk-stock' },
  '平安': { code: '000001', market: 'a-share' },
  '中国平安': { code: '601318', market: 'a-share' },
  '招商银行': { code: '600036', market: 'a-share' },
  '比亚迪': { code: '002594', market: 'a-share' },
  '宁德时代': { code: '300750', market: 'a-share' },
  '阿里巴巴': { code: '09988', market: 'hk-stock' },
  '美团': { code: '03690', market: 'hk-stock' },
  '小米': { code: '01810', market: 'hk-stock' },
  '京东': { code: '09618', market: 'hk-stock' },
  '百度': { code: '09888', market: 'hk-stock' },
  '快手': { code: '01024', market: 'hk-stock' },
  '中石油': { code: '601857', market: 'a-share' },
  '中石化': { code: '600028', market: 'a-share' },
  '工商银行': { code: '601398', market: 'a-share' },
  '建设银行': { code: '601939', market: 'a-share' },
  '农业银行': { code: '601288', market: 'a-share' },
  '中国银行': { code: '601988', market: 'a-share' },
};

/**
 * 从用户输入中提取股票信息
 */
export function extractStockInfo(query: string): StockInfo | null {
  // A股代码匹配 (6位数字)
  const aShareMatch = query.match(/(\d{6})/);
  // 港股代码匹配 (5位数字)
  const hkMatch = query.match(/(\d{5})(?!\d)/);

  // 先尝试匹配名称
  for (const [name, info] of Object.entries(STOCK_NAME_MAP)) {
    if (query.includes(name)) {
      return {
        name,
        code: info.code,
        market: info.market,
        fullCode: info.market === 'a-share'
          ? (info.code.startsWith('6') ? `sh${info.code}` : `sz${info.code}`)
          : `hk${info.code}`,
      };
    }
  }

  // 再尝试匹配代码
  if (aShareMatch) {
    const code = aShareMatch[1];
    return {
      name: '未知',
      code,
      market: 'a-share',
      fullCode: code.startsWith('6') ? `sh${code}` : `sz${code}`,
    };
  }

  if (hkMatch) {
    const code = hkMatch[1].padStart(5, '0');
    return {
      name: '未知',
      code,
      market: 'hk-stock',
      fullCode: `hk${code}`,
    };
  }

  return null;
}

/**
 * 获取当前交易时段
 */
export function getCurrentSession(market: 'a-share' | 'hk-stock'): { session: TradingSession; config: SessionConfig } {
  const now = new Date();
  // 使用北京时间
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const timeStr = beijingTime.toTimeString().slice(0, 5); // HH:MM format

  const sessions = market === 'a-share' ? A_SHARE_SESSIONS : HK_STOCK_SESSIONS;

  for (const [key, config] of Object.entries(sessions)) {
    if (timeStr >= config.start && timeStr < config.end) {
      return { session: key as TradingSession, config };
    }
  }

  // 默认返回盘前
  return { session: 'pre-market', config: sessions['pre-market'] };
}

/**
 * 获取股票行情（模拟实现，实际应调用 MX_FinData MCP）
 */
export async function getStockQuote(stockInfo: StockInfo): Promise<StockQuote | null> {
  // TODO: 实际实现应调用 MX_FinData MCP 工具
  // 例如: const quote = await mcp.MX_FinData.getQuote(stockInfo.fullCode);

  // 生成模拟数据用于开发测试
  const basePrice = 100 + Math.random() * 50;
  const changePercent = (Math.random() - 0.5) * 5;
  const change = basePrice * changePercent / 100;
  const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);

  return {
    name: stockInfo.name,
    code: stockInfo.code,
    price: basePrice,
    change,
    changePercent,
    open,
    high: Math.max(basePrice, open) * (1 + Math.random() * 0.03),
    low: Math.min(basePrice, open) * (1 - Math.random() * 0.03),
    volume: 1000000 + Math.random() * 5000000,
    amount: 500000000 + Math.random() * 2000000000,
    bid: basePrice - 0.01,
    ask: basePrice + 0.01,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 构建分析提示词
 *
 * @param query - 用户查询，包含股票信息和实时行情数据
 * @param session - 交易时段
 * @param sessionConfig - 时段配置
 * @returns 分析提示词
 */
export function buildAnalysisPrompt(
  query: string,
  _session: TradingSession,
  sessionConfig: SessionConfig,
): string {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const prompt = `你是一位资深股票分析师，专注于开盘交易决策分析。

## 分析时间
${now}

## 当前交易时段
- 时段: ${sessionConfig.name}
- 描述: ${sessionConfig.description}
- 时间范围: ${sessionConfig.start} - ${sessionConfig.end}

## 用户提供的股票信息与行情数据
${query}

## 分析任务
请基于以上信息，从以下维度进行专业分析：

1. **市场情绪分析** - 当前市场整体情绪（恐慌/中性/乐观）
2. **个股表现评估** - 该股票相对大盘的表现
3. **技术面分析** - 关键支撑位、压力位、技术指标
4. **资金流向判断** - 资金流入流出情况
5. **${sessionConfig.name}特定策略** - 针对当前时段的加仓策略

## 输出要求
请严格按照以下格式输出：

当前情绪: [恐慌/谨慎/中性/乐观/狂热]
个股强度: [弱势/偏弱/中性/偏强/强势]

关键价位:
- 支撑位1: ¥XX.XX
- 支撑位2: ¥XX.XX
- 压力位1: ¥XX.XX
- 压力位2: ¥XX.XX

${sessionConfig.name}策略:
[针对当前时段的具体操作策略]

加仓建议:
- 建议操作: [立即加仓/等待回调/观望/减仓]
- 建议价位: ¥XX.XX - ¥XX.XX
- 建议仓位: [如: 20%仓位/半仓/保持现有仓位]
- 止损位: ¥XX.XX

风险提示:
- [风险点1]
- [风险点2]

置信度: [0.0-1.0]

请用简体中文回答。`;

  return prompt;
}

/**
 * 加载开盘交易专用 judge prompt
 */
export function loadOpeningTradeJudgePrompt(): string {
  const promptPath = join(__dirname, '..', 'prompts', 'judge_opening_trade.txt');
  return readFileSync(promptPath, 'utf-8');
}

/**
 * 格式化分析结果
 *
 * @param result - 分析结果文本
 * @param sessionConfig - 时段配置
 * @returns 格式化后的结果字符串
 */
export function formatAnalysisResult(
  result: string,
  sessionConfig: SessionConfig,
): string {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  let header = `
╔════════════════════════════════════════════════════════════════╗
║           Wei Opening Trade - 开盘交易决策分析                  ║
╠════════════════════════════════════════════════════════════════╣
║ 时段: ${sessionConfig.name.padEnd(30)} ║
║ 时间: ${now.padEnd(44)} ║
╚════════════════════════════════════════════════════════════════╝
`;

  return `${header}
${result}

---
免责声明: 本分析仅供参考，不构成投资建议。股市有风险，投资需谨慎。
`;
}

/**
 * 解析模型分析结果
 */
export interface ParsedAnalysis {
  sentiment: string;
  strength: string;
  supportLevels: number[];
  resistanceLevels: number[];
  strategy: string;
  recommendation: string;
  entryPrice: string;
  positionSize: string;
  stopLoss: number | null;
  risks: string[];
  confidence: number;
}

/**
 * 从模型输出中解析分析结果
 */
export function parseAnalysisOutput(output: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    sentiment: '中性',
    strength: '中性',
    supportLevels: [],
    resistanceLevels: [],
    strategy: '',
    recommendation: '观望',
    entryPrice: '',
    positionSize: '',
    stopLoss: null,
    risks: [],
    confidence: 0.5,
  };

  // 解析情绪
  const sentimentMatch = output.match(/当前情绪[:：]\s*(.+)/i);
  if (sentimentMatch) {
    result.sentiment = sentimentMatch[1].trim();
  }

  // 解析个股强度
  const strengthMatch = output.match(/个股强度[:：]\s*(.+)/i);
  if (strengthMatch) {
    result.strength = strengthMatch[1].trim();
  }

  // 解析支撑位
  const supportMatches = output.matchAll(/支撑.*?[:：]\s*[¥]?(\d+\.?\d*)/gi);
  for (const match of supportMatches) {
    result.supportLevels.push(parseFloat(match[1]));
  }

  // 解析压力位
  const resistanceMatches = output.matchAll(/压力.*?[:：]\s*[¥]?(\d+\.?\d*)/gi);
  for (const match of resistanceMatches) {
    result.resistanceLevels.push(parseFloat(match[1]));
  }

  // 解析建议操作
  const recMatch = output.match(/建议操作[:：]\s*(.+)/i);
  if (recMatch) {
    result.recommendation = recMatch[1].trim();
  }

  // 解析建议价位
  const priceMatch = output.match(/建议价位[:：]\s*(.+)/i);
  if (priceMatch) {
    result.entryPrice = priceMatch[1].trim();
  }

  // 解析仓位
  const posMatch = output.match(/建议仓位[:：]\s*(.+)/i);
  if (posMatch) {
    result.positionSize = posMatch[1].trim();
  }

  // 解析止损位
  const stopMatch = output.match(/止损位[:：]\s*[¥]?(\d+\.?\d*)/i);
  if (stopMatch) {
    result.stopLoss = parseFloat(stopMatch[1]);
  }

  // 解析置信度
  const confMatch = output.match(/置信度[:：]\s*([0-9.]+)/i);
  if (confMatch) {
    result.confidence = parseFloat(confMatch[1]);
  }

  return result;
}
