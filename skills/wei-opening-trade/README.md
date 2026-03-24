# Wei Opening Trade

智能股票开盘交易决策助手 - 结合实时行情与多模型交叉验证，提供A股/港股开盘加仓策略分析。

## 功能特点

- **智能股票识别** - 自动从输入中提取股票名称和代码
- **实时行情获取** - 获取最新股票行情数据
- **多维度分析** - 结合技术分析、市场情绪、资金流向
- **分时段策略** - 根据交易时间段提供针对性建议
- **风险控制** - 内置仓位管理和止损建议

## 支持市场

- **A股** - 上海证券交易所、深圳证券交易所
- **港股** - 香港联合交易所

## 交易时段

| 时段 | A股时间 | 港股时间 | 分析重点 |
|------|---------|----------|----------|
| 盘前 | < 09:30 | < 09:30 | 开盘预测，制定预案 |
| 早盘 | 09:30-11:30 | 09:30-12:00 | 开盘质量，成交量分析 |
| 午休 | 11:30-13:00 | 12:00-13:00 | 上午复盘，策略调整 |
| 午盘 | 13:00-14:30 | 13:00-15:30 | 趋势确认，加仓时机 |
| 尾盘 | 14:30-15:00 | 15:30-16:00 | 尾盘机会，仓位调整 |

## 使用方法

### 命令行

```bash
# 分析A股
bun run scripts/index.ts --trade "分析茅台今日开盘"

# 分析港股
bun run scripts/index.ts --trade "腾讯控股，关注游戏板块"

# 使用股票代码
bun run scripts/index.ts --trade "600519 贵州茅台"
bun run scripts/index.ts --trade "00700 腾讯控股"

# 或使用 npm 脚本
npm run trade -- "分析茅台"
```

### 程序调用

```typescript
import { analyzeOpeningTrade } from './scripts/index.js';

const result = await analyzeOpeningTrade("分析茅台今日开盘策略");
console.log(result);
```

## 分析输出

分析报告包含以下内容：

- **市场情绪** - 恐慌/谨慎/中性/乐观/狂热
- **个股表现** - 弱势/偏弱/中性/偏强/强势
- **关键价位** - 支撑位、压力位
- **情景分析** - 基础/乐观/悲观三种情景
- **交易建议** - 具体操作方向、价位、仓位、止损
- **风险提示** - 潜在风险因素

## 配置

### 环境变量

```bash
# OpenRouter API Key
export OPENROUTER_API_KEY="your-key"

# 阿里云 Bailian (可选)
export BAILIAN_API_KEY="your-key"
```

### 配置文件

- `config.json` - 模型配置
- `config_dashscope.json` - 阿里云 DashScope 配置
- `config_stock.json` - 股票专用配置

## 项目结构

```
wei-opening-trade/
├── scripts/
│   ├── index.ts           # 主入口
│   ├── agent.ts           # 研究代理核心
│   ├── trade.ts           # 交易分析模块
│   └── clients/           # API 客户端
├── prompts/
│   ├── judge.txt          # 基础 judge prompt
│   ├── judge_financial.txt # 金融专用 judge
│   └── judge_opening_trade.txt # 开盘交易专用 judge
├── config.json            # 模型配置
├── SKILL.md               # Skill 文档
└── package.json
```

## 依赖

- [Bun](https://bun.sh) >= 1.0
- TypeScript >= 5.0
- axios
- dotenv

## 免责声明

本工具提供的分析仅供参考，不构成投资建议。股市有风险，投资需谨慎。用户应根据自身风险承受能力和投资目标做出独立判断。

## 许可证

MIT
