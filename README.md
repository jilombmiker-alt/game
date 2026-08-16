# 人生岔路 · AI 多世界互动叙事

《人生岔路》是一款可以直接在线玩的中文分支叙事产品。玩家在 11 个彼此独立又能连续继承的世界里做选择、填写自由输入、承担永久后果，并把九个旧世界的公共历史带入两部大型连续故事。

本仓库同时作为 AI 产品课程作业的可编辑源码与证据入口，包含产品实现、PRD、100 分测评标准、72 条测评集和测试报告。

## 直接体验与审阅

- [在线产品](https://life-branch-stories.jilombmiker.chatgpt.site)
- [教师审阅总入口](https://life-branch-stories.jilombmiker.chatgpt.site/product-docs)
- [PRD PDF](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/life-branch-prd-v2.pdf)
- [测评标准 PDF](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/life-branch-evaluation-standard-v2.pdf)
- [72 条测评集 PDF](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/life-branch-evaluation-set-v2.pdf)
- [测试与验收报告](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/life-branch-test-report-v2.md)
- [教师 5–10 分钟快速路线](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/teacher-quick-start-v2.md)
- [完整源码 ZIP](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/life-branch-source-v2.zip)

## 产品规模

| 层级 | 故事 | 幕数 | 自由输入 | 结局 |
|---|---:|---:|---:|---:|
| 小型世界 S01–S04 | 4 | 72 | 16 | 20 |
| 中型世界 M01–M05 | 5 | 228 | 47 | 35 |
| 大型连续世界 L01–L02 | 2 | 200 | 40 | 16 |
| 合计 | **11** | **500** | **103** | **71** |

## 核心产品设计

- 玩家不是寻找唯一正确答案，而是在关系、资源、身份和公共后果之间做带代价的选择。
- 自由输入使用本地、可复现的语义路由，检查否定、矛盾、角色同意、可用资源和永久事实，运行时不依赖远程模型。
- 角色拥有独立目标、边界和拒绝权；高关系值不能把人物变成完全服从的工具。
- 死亡、永久伤害、失权、拒绝、失词和世界损失进入事实账本，后续剧情不得撤销。
- 九个旧世界彼此独立，但玩家选择的公共历史会以只读快照进入 L01；L02 再继承九界与 L01 正史。
- 旧小型世界保留原路由、原运行方式和浏览器存档，扩展内容不覆盖旧档。

## 11 个世界

### 小型世界

- S01《霓虹雨季》
- S02《雾港来信》
- S03《北境余烬》
- S04《今天别做主角》

### 中型世界

- M01《我们在废墟上发明明天》
- M02《借神之名》
- M03《退潮线以内》
- M04《盐月沉入森林》
- M05《史书之外有长河》

### 大型连续世界

- L01《九个世界没有共同的明天》
- L02《群星不接受统一答案》

## 教师建议审阅路线

用 5–10 分钟依次查看：

1. 首页确认 4+5+2 的内容层级。
2. 进入 M04，观察“异族养大的孩子”和两族生态冲突。
3. 进入 L01，观察九界通道仲裁、旧世界正史和动态见证者。
4. 在测评集中抽查 EV-037 否定输入、EV-061 只读继承、EV-071 构建测试。
5. 打开测试报告，区分已验证证据与待真实玩家验证项目。

## 项目结构

```text
app/                       页面、故事引擎、故事数据与样式
  product-docs/            教师审阅总入口
  world/[worldId]/         五部中型世界动态路由
  large/[worldId]/         两部大型世界动态路由
public/teacher/            PRD、测评标准、测评集、报告与下载文件
scripts/                   世界生成、构建校验与文档生成工具
tests/                     叙事契约、输入安全、存档、继承与渲染测试
.openai/hosting.json       Sites 托管配置
```

## 本地运行

环境要求：Node.js 22.13 或更高版本。

```bash
npm ci
npm run dev
```

正式构建和全量自动测试：

```bash
npm test
```

当前教师审阅版结果为 **71/71 通过，0 失败**。详细边界见[测试与验收报告](https://life-branch-stories.jilombmiker.chatgpt.site/teacher/life-branch-test-report-v2.md)。

## 测评方法

测评采用 100 分制，80 分及格，同时设置 P0 一票否决。最高权重是“叙事因果与永久事实”25 分，其余覆盖玩家能动性、人物自主、连续性、稳定性、存档、体验、隐私安全和产品证据。

72 条案例分为三类证据：

- A：自动化证据
- H：人工检查证据
- U：真实用户证据

当前构建和 71 条自动测试已通过；Safari、完整人工案例和 5 名真实用户试玩尚未完成，因此发布判断为 Conditional Go，而不是伪造一个最终满分。

## 版本演进与取舍

项目先保留原“人生岔路”四个小型世界，再接入五部中型世界和两部大型连续故事。这样做的优点是旧内容立即可玩、旧存档不丢失、每一阶段都能验证；代价是暂时存在两套故事运行结构，需要通过统一首页、事实协议和测试消化复杂度。PRD 中记录了完整决策过程与后续统一计划。

## 人机协作说明

本项目由学生与 AI 协作完成。学生通过多轮选择确定故事主题、产品取舍、旧站兼容、上线节奏和测评口径；AI 参与需求结构化、代码实现、文档生成与自动测试。仓库保留限制和待测项目，不把“AI 生成了材料”当作“产品已经被真实用户验证”。

## License

课程作业与演示用途。故事文本、视觉和代码的再使用请先征得作者同意。
