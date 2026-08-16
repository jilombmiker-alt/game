import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const contentDir = path.join(root, "content", "medium-worlds");
const output = path.join(root, "app", "medium-worlds.generated.json");

const read = (name) => fs.readFileSync(path.join(contentDir, name), "utf8");
const clean = (value = "") => value
  .replace(/<mark>|<\/mark>/g, "")
  .replace(/\{playerName\}/g, "你")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/^>\s?/gm, "")
  .replace(/^\*([^*]+)\*$/gm, "$1")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

function section(block, startPattern, endPatterns = []) {
  const start = block.search(startPattern);
  if (start < 0) return "";
  const afterHeading = block.slice(start).replace(startPattern, "");
  let end = afterHeading.length;
  for (const pattern of endPatterns) {
    const index = afterHeading.search(pattern);
    if (index >= 0) end = Math.min(end, index);
  }
  return clean(afterHeading.slice(0, end));
}

function rowsFromTable(table) {
  const lines = table.split("\n").filter((line) => line.trim().startsWith("|"));
  if (lines.length < 3) return [];
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const headers = cells(lines[0]);
  return lines.slice(2).map((line) => Object.fromEntries(headers.map((header, index) => [header, cells(line)[index] ?? ""])));
}

function firstTable(block, marker) {
  const markerIndex = block.search(marker);
  if (markerIndex < 0) return [];
  const after = block.slice(markerIndex).split("\n");
  const tableLines = [];
  let inTable = false;
  for (const line of after) {
    if (line.trim().startsWith("|")) {
      inTable = true;
      tableLines.push(line);
    } else if (inTable) {
      break;
    }
  }
  return rowsFromTable(tableLines.join("\n"));
}

function choiceFromM01(row, fallbackIndex) {
  const combined = row["choiceId 与选项"] ?? "";
  const id = clean(row.choiceId || row.routeId || combined.match(/`([^`]+)`/)?.[1] || `m01-choice-${fallbackIndex}`);
  const combinedAction = combined.replace(/`[^`]+`/, "").replace(/[　\s]+/, " ").trim();
  return {
    id,
    action: clean(row["行动"] || row["识别意图"] || combinedAction),
    benefit: clean(row["可见收益"] || row["眼前收益"]),
    cost: clean(row["明确代价"] || row["眼前代价"]),
    effects: clean(row["effect 标签"] || row.effects || "").match(/`([^`]+)`/g)?.map((value) => value.slice(1, -1)) ?? [],
  };
}

function parseM01Acts(text) {
  const matches = [...text.matchAll(/^#{2,3} 第(\d+)幕(?:[　 ]+([^\n]+)|《([^》]+)》)$/gm)].filter((match) => Number(match[1]) <= 45);
  return matches.map((match, index) => {
    const block = text.slice(match.index, matches[index + 1]?.index ?? text.indexOf("## 固定结局", match.index));
    const objectiveRows = firstTable(block, /#### objective \/ conflict/);
    const objective = clean(objectiveRows[0]?.objective || block.match(/`objective`\s+([^\n]+)/)?.[1] || "推进本幕冲突并留下可追溯选择");
    const conflict = clean(objectiveRows[0]?.conflict || block.match(/`conflict`\s+([^\n]+)/)?.[1] || "每条路线都会让具体的人或土地承担代价");
    const isFree = block.includes("#### 自由输入路由") || block.includes("### 自由路由") || block.includes("**自由输入路由**");
    const choiceMarker = isFree ? /(?:#### 自由输入路由|### 自由路由|\*\*自由输入路由\*\*)/ : /(?:#### 选择|### 选择|\*\*选择\*\*)/;
    const choiceRows = firstTable(block, choiceMarker);
    let choices = choiceRows.map(choiceFromM01);
    if (!choices.length) {
      const routeBlock = section(block, choiceMarker, [/`term`/, /`rejectionRules`/, /#### 高亮线索/, /`fateNotice`/]);
      choices = routeBlock.split("\n").filter((line) => /^- m01-/.test(line.trim())).map((line, routeIndex) => {
        const id = line.match(/^- (m01-[^\s]+)/)?.[1] || `m01-choice-${match[1]}-${routeIndex + 1}`;
        const detail = clean(line.replace(/^- m01-[^\s]+\s*/, ""));
        const action = detail.split(/。?收益为|。?`effects`/)[0].trim();
        const benefit = clean(detail.match(/收益为([^，。]+)/)?.[1] || (isFree ? "把自由行动转化为可执行路线" : "推进所选目标"));
        const cost = clean(detail.match(/代价为([^。]+)/)?.[1] || (isFree ? "仍须承担资源、关系或时间代价" : "另一项目标将承受损失"));
        const effects = detail.split("effects").slice(1).join("effects").split(/\s{2,}|，/).map(clean).filter(Boolean);
        return { id, action, benefit, cost, effects };
      });
    }
    if (!choices.length && Number(match[1]) === 45) {
      choices = [{ id:"m01-a45-resolve-ending", action:"提交七地最终记录并结算结局", benefit:"让世界、人物和你的代价进入正式档案", cost:"所有已经发生的永久事实都会保留", effects:["resolve_ending"] }];
    }
    const prose = section(block, /#### 正文\s*/, [/#### 人物对白/, /#### 选择/, /#### 自由输入路由/, /### 选择/, /### 自由路由/, /\*\*选择\*\*/, /\*\*自由输入路由\*\*/])
      .split(/\n\n+/).map(clean).filter(Boolean);
    const dialogue = section(block, /#### 人物对白\s*/, [/#### 选择/, /#### 自由输入路由/, /#### 高亮线索/]);
    const prelude = section(block, /#### 前情与转场\s*/, [/#### objective \/ conflict/]);
    const chapter = Number(match[1]) <= 9 ? "第一章《二十一天》" : Number(match[1]) <= 18 ? "第二章《土地欠下的账》" : Number(match[1]) <= 27 ? "第三章《谁有资格决定未来》" : Number(match[1]) <= 36 ? "第四章《晨心》" : "第五章《把明天交给后来的人》";
    return {
      no: Number(match[1]), title: clean(match[2] || match[3]), chapter, time: `灰冬倒计时｜第${match[1]}幕`, location: "七聚落共同体",
      present: ["你", "陆镜", "温葵", "雁伏"], objective, conflict, prelude, prose, dialogue,
      choices, freeInput: isFree,
      freePrompt: isFree ? clean(block.match(/输入提示为“([^”]+)”/)?.[1] || block.match(/`prompt`\s+([^\n]+)/)?.[1] || "写下包含执行者、资源、代价与停止条件的行动方案") : "",
      clue: section(block, /#### 高亮线索\s*/, [/#### 新术语/]).replace(/^-\s*/gm, ""),
      echo: section(block, /#### branchEcho\s*/, [/\| scene/, /### 第/, /## 第/]),
      hook: clean(prose.at(-1) || "下一项决定已经抵达"),
      music: clean(block.match(/\| `[^`]+` \| ([^|]+) \| [^|]+ \| `([^`]+)` \|/)?.slice(1).join(" · ") || "低音钢琴与远处机械声"),
    };
  });
}

function parseM02Acts(text) {
  const storyEnd = text.indexOf("# 七个结局与三十五张人物归宿卡");
  const source = text.slice(0, storyEnd);
  const matches = [...source.matchAll(/^## 第(\d+)幕《([^》]+)》$/gm)];
  return matches.map((match, index) => {
    const block = source.slice(match.index, matches[index + 1]?.index ?? source.length);
    const isFree = block.includes("### 自由输入");
    const choiceRows = firstTable(block, isFree ? /### 自由输入/ : /\*\*选择\*\*/);
    let choices = choiceRows.map((row, rowIndex) => ({
      id: clean(row.choiceId || row.routeId || `m02-choice-${match[1]}-${rowIndex + 1}`),
      action: clean(row["行动"] || row["预写方向"]),
      benefit: clean(row["眼前收益"] || row["必填结果"]),
      cost: clean(row["眼前代价与 effects"] || (isFree ? "方案必须明确执行者、资源和停止条件" : "")),
      effects: clean(row["眼前代价与 effects"] || "").match(/`([^`]+)`/g)?.map((value) => value.slice(1, -1)) ?? [],
    }));
    if (!choices.length && Number(match[1]) === 45) {
      choices = [{ id:"m02-a45-resolve-ending", action:"归还借来的权力并结算结局", benefit:"让世界、人物和责任进入正式档案", cost:"所有已经发生的永久事实都会保留", effects:["resolve_ending"] }];
    }
    const prose = section(block, /#### 正文\s*/, [/\*\*动作对白\*\*/, /### 自由输入/, /\*\*选择\*\*/])
      .replace(/^正文[一二三四五六七八九十]+\s*$/gm, "")
      .split(/\n\n+/).map(clean).filter(Boolean);
    const actionDialogue = section(block, /\*\*动作对白\*\*\s*/, [/\*\*选择\*\*/, /### 自由输入/, /\*\*重点线索\*\*/]);
    const prelude = section(block, /\*\*背景与前情转场\*\*\s*/, [/\*\*objective\*\*/]);
    const objective = clean(block.match(/\*\*objective\*\*[　\s]*([^\n]+)/)?.[1] || "完成本幕可以执行、可以追责的决定");
    const conflict = clean(block.match(/\*\*conflict\*\*[　\s]*([^\n]+)/)?.[1] || "神迹的收益与代价必须同时落到具名的人身上");
    const chapterNo = Math.ceil(Number(match[1]) / 9);
    const chapterNames = ["最后十二桶水", "被删掉的人", "谁来认领灾难", "旧神开口", "审判仍要执行"];
    return {
      no: Number(match[1]), title: clean(match[2]), chapter: `第${chapterNo}章《${chapterNames[chapterNo - 1]}》`, time: `借雨大礼倒计时｜第${match[1]}幕`, location: "大昭三州",
      present: ["你", "裴衡", "祝照临", "商六问"], objective, conflict, prelude, prose, dialogue: actionDialogue,
      choices,
      freeInput: isFree,
      freePrompt: isFree ? "写下谁先得到帮助、资源从哪里来、谁执行，以及命令何时停止" : "",
      clue: section(block, /\*\*重点线索\*\*\s*/, [/\*\*术语\*\*/]).replace(/^-\s*/gm, ""),
      echo: prelude,
      hook: clean(prose.at(-1) || "下一份责任账已经送到"),
      music: clean(block.match(/\| `([^`]+)` \| ([^|]+) \| [^|]+ \| `([^`]+)` \|/)?.slice(1).join(" · ") || "毛毡钢琴、木声与远处水响"),
    };
  });
}

function parseMarkdownEndings(text, worldId) {
  const pattern = /^## (固定|隐藏)?结局(?:[一二三四五六七八九十]+)?《([^》]+)》$/gm;
  const matches = [...text.matchAll(pattern)];
  return matches.map((match, index) => {
    const block = text.slice(match.index, matches[index + 1]?.index ?? text.length);
    const id = clean(block.match(/`endingId`[　\s]+`([^`]+)`/)?.[1] || `${worldId}-ending-${index + 1}`);
    const world = section(block, /\*\*世界结果\*\*\s*/, [/\*\*直接代价\*\*/, /\*\*结局原因\*\*/, /\*\*关键因果链\*\*/]);
    const causesText = section(block, /\*\*(?:关键因果链|结局原因)\*\*\s*/, [/\| 人物/, /\| 人物卡模板/, /\*\*ending cue\*\*/, /^---$/m]);
    const causes = causesText.split("\n").map((line) => clean(line.replace(/^\d+\.\s*/, ""))).filter((line) => line && !line.startsWith("|"));
    const table = firstTable(block, /\| (?:人物|人物卡模板) \|/);
    const epilogues = table.slice(0, 5).map((row) => ({
      status: clean(row.status || row["结局语料边界（非状态字段）"]),
      where: clean(row["去向"] || "结局后的世界"),
      choice: clean(row["最后自主选择"] || row["可用自主选择语料"]),
      cost: clean(row["具体代价"] || row["可用代价语料"]),
      lastLine: clean(row["最后一句对白"] || row["可用原始对白"]),
    }));
    const directCost = section(block, /\*\*直接代价\*\*\s*/, [/\*\*关键因果链\*\*/]).split("\n").find((line) => line.trim().startsWith("-"));
    const playerRow = epilogues[0];
    return {
      id, hidden: match[1] === "隐藏", name: clean(match[2]), condition: clean(causes.at(0) || "由完整选择链决定"),
      world, playerCost: clean(directCost?.replace(/^\-\s*/, "") || playerRow?.cost || "你必须承担自己签署的长期代价"),
      causes: causes.slice(0, 5), scene: world.split(/\n\n/).slice(-2).join("\n\n"), epilogues,
    };
  }).slice(0, 7);
}

function mapStructuredWorld(source, extra) {
  const freeByAct = new Map((source.freeInputs || []).map((item) => [item.act, item]));
  return {
    id: source.id, slug: source.id.toLowerCase(), title: source.title, ...extra,
    oneLine: source.oneLine, player: source.player, crisis: source.crisis, firstTask: source.firstTask,
    rules: source.rules, history: source.history, fixedPast: source.fixedPast, traits: source.traits, stances: source.stances,
    ability: source.ability, abilityCost: source.abilityCost, factions: source.factions, terms: source.terms,
    metrics: source.metrics.map((metric, index) => ({ id: `m${index + 1}`, label: metric.name, description: metric.meaning, initial: 50 })),
    resources: source.resources, permanentFacts: source.permanentFacts, chapters: source.chapters,
    characters: source.characters.map((character, index) => ({ id: `c${index + 1}`, ...character })),
    acts: source.acts.map((act) => {
      const free = freeByAct.get(act.no);
      return {
        no: act.no, title: act.title, chapter: act.chapter, time: act.time, location: act.location, present: act.present,
        objective: act.objective, conflict: act.conflict, prelude: act.prelude,
        prose: [act.setup, act.action, act.mechanism, act.reveal, act.dialogue, act.cost, act.aftermath].map(clean).filter(Boolean),
        dialogue: clean(act.dialogue), choices: act.choices.map((choice) => ({ ...choice, effects: [] })),
        freeInput: Boolean(free), freePrompt: free ? "描述你的行动。方案必须说明谁执行、使用什么资源、谁承担代价，以及何时停止。" : "",
        freeRoutes: free?.routes ?? [], clue: act.clue, echo: act.echo, hook: act.hook, music: act.music, visual: act.visual,
      };
    }),
    endings: source.endings,
    audioPrinciples: source.audioPrinciples,
  };
}

const m01Text = read("M01_我们在废墟上发明明天_完整故事规格_v1.0.md");
const m02Text = read("M02_借神之名_完整故事规格_v1.0.md");

const m01 = {
  id: "M01", slug: "m01", title: "我们在废墟上发明明天", genre: "生态科幻", tone: "文明抉择", accent: "#8fd7c4", actCount: 45,
  oneLine: "灰冬提前抵达，七个聚落必须在有限能源、土地未来和无登记者的生存之间重新签署共同生活的规则。",
  player: "你是七地共同任命的能源配额调停者。你能签署临时配额、公开责任记录，却不能创造能源，也不能替聚落同意牺牲。",
  crisis: "遮蔽阳光的灰冬提前六十七天到来。医院、温室、净水与没有正式编号的灰园居民同时需要同一张老化电网。",
  firstTask: "在十分钟内签出第一份临时配额，并决定谁先获得灰冬后的电。",
  rules: ["能源、土地和运输都不能凭空增加。", "人物死亡、伤残、停权和决裂是永久事实。", "晨心只能完整选择一种命运。", "高关系不能取消人物底线。"],
  history: ["旧城灾变后，七个聚落依靠一张老化区域电网存续。", "灰园长期存在于地图，却没有正式政治席位。", "晨心种核可能修复土地，也可能被转化为十二年稳定能源。"],
  fixedPast: "九年前，你曾签字切断灰园支线救下地穹医院，陆镜替你承担公开处分。",
  traits: ["系统调度", "公共谈判", "证据追踪"], stances: ["当代生存优先", "未来土地优先", "程序与共同授权优先"],
  ability: "把各地请求换算成电量、时间、土地与具名责任。", abilityCost: "每次越权都进入公开审判记录，任何新增保障都会从另一处扣除资源。",
  factions: [{name:"镜坝与地穹",want:"维持主网、医疗和净水",reason:"当下有人等不起长期协商",cost:"边缘聚落与未来土地"},{name:"葵田与盐井",want:"保留种核和生态修复窗口",reason:"能源胜利可能制造长期失土",cost:"眼前供电与医疗能力"},{name:"灰园与雁轨",want:"让无登记者获得席位和可追查配额",reason:"他们长期承担维护与运输却不被法律承认",cost:"既有七地的资源和权力"}],
  terms: [{name:"灰冬",meaning:"高空尘带遮住阳光造成的长期低温期",relevance:"它同时压低发电、粮食和医疗能力"},{name:"晨心",meaning:"能够改变能源或土地未来的旧文明种核",relevance:"它只能完整走向一种不可逆用途"},{name:"配额印",meaning:"每次拨电留下的公开凭证",relevance:"它决定谁被制度承认为共同体成员"}],
  metrics: [{id:"m1",label:"生存保障",description:"医疗、供暖和基本生活",initial:50},{id:"m2",label:"土壤未来",description:"粮食与生态恢复能力",initial:50},{id:"m3",label:"共同体协作",description:"七地是否继续互相承担",initial:50},{id:"m4",label:"公共正当",description:"权力是否可追责和可撤回",initial:50},{id:"m5",label:"旧制控制",description:"中央与单人权力强度",initial:50}],
  resources: [{name:"区域电网",initial:"濒临保护阈值",rule:"一处增供必然减少另一处"},{name:"晨心种核",initial:"完整",rule:"相变、拆分或死亡后不可恢复"},{name:"轨道与滤芯",initial:"严重不足",rule:"运输损失会转化为医疗与粮食损失"}],
  permanentFacts: ["人物死亡、伤残、失权与决裂不会自动恢复。", "晨心完成相变后不能回到种核。", "主网与微网的物理损毁必须进入后续结算。"],
  chapters: [{no:1,name:"二十一天",range:"1至9"},{no:2,name:"土地欠下的账",range:"10至18"},{no:3,name:"谁有资格决定未来",range:"19至27"},{no:4,name:"晨心",range:"28至36"},{no:5,name:"把明天交给后来的人",range:"37至45"}],
  characters: [{id:"c1",name:"陆镜",role:"总调度官",publicGoal:"用集中调度守住七地",contradiction:"冷酷克制，却从不把自己的家人放在优先表前",bottomLine:"不伪造伤亡，也不让下属替他承担签名"},{id:"c2",name:"温葵",role:"土壤医生",publicGoal:"保住晨心与土地修复窗口",contradiction:"珍惜未来生命，却曾越过当代人的同意",bottomLine:"不允许土地损失被能源成就抹去"},{id:"c3",name:"雁伏",role:"雁轨运输者",publicGoal:"让边缘者获得物资和路线",contradiction:"善于交易与隐瞒，却长期保护没有编号的孩子",bottomLine:"不交出儿童住址"},{id:"c4",name:"苔",role:"动态维护智能",publicGoal:"获得拒绝、任期与受审权",contradiction:"拥有修复世界的能力，却拒绝成为永久工具",bottomLine:"不接受别人替它同意牺牲"}],
  acts: parseM01Acts(m01Text), endings: parseMarkdownEndings(m01Text, "m01"), audioPrinciples:["程序化声景，不依赖外部音频。","灰冬以低音钢琴、变压器脉冲和远风构成。"],
};

const m02 = {
  id: "M02", slug: "m02", title: "借神之名", genre: "玄幻神话", tone: "制度悬疑", accent: "#e7b56f", actCount: 45,
  oneLine: "王朝可以把旱灾转移给另一个地方，却必须删去承担者的名字。你要决定神迹还能不能建立在未经同意的牺牲上。",
  player: "你是誓名院巡审官。你能暂停、改写或退回誓约，却不能创造水，也不能替受影响者签字。",
  crisis: "京畿四十一天无雨，七十二小时后借雨大礼将把洪水、疫病和身份删除转移给青芜。",
  firstTask: "分配城中最后十二桶净水，并把谁承担缺口写进公共记录。",
  rules:["神迹只能转移损失，不能消灭损失。","被删去名字的人仍真实承担伤害。","临时权力必须有执行者与停止条件。","人物同意不能由好感或亲情代替。"],
  history:["柳川旧案曾以三百余名无名者换取京畿丰年。","神庭把水务技术包装成不可质疑的神迹。","青芜长期承担借雨后的洪水与疫病，却没有拒绝席位。"],
  fixedPast:"八年前，你在柳川誓约上签名并因此晋升。如今旧泥仍留在巡审印边缘。",
  traits:["证词审查","水务推演","公开谈判"], stances:["先救当下","先补同意","先追完整责任"], ability:"让誓约暂停并要求补齐受益者、承担者、执行者和停止条件。", abilityCost:"每次停礼都会消耗真实的水、粮和政治窗口。",
  factions:[{name:"誓名院与神庭",want:"按传统完成借雨以保三州",reason:"大旱已经逼近粮荒",cost:"青芜与被删名者"},{name:"青芜代理人",want:"获得知情、拒绝和补偿",reason:"当地长期承担神迹代价",cost:"京畿即时供水和粮食"},{name:"暗河与无名者网络",want:"保护名单并让技术脱离神职垄断",reason:"公开身份可能带来追捕",cost:"责任核验和公共信任"}],
  terms:[{name:"巡审印",meaning:"暂停、改写或退回誓约的审查权",relevance:"它不能创造资源或替人同意"},{name:"借雨",meaning:"把一地旱灾转化为另一地洪水的国家仪式",relevance:"每一场雨都有具名或被删名的承担者"},{name:"停止条件",meaning:"让临时命令自动结束的明确规则",relevance:"没有它的紧急权会继续生效"}],
  metrics:[{id:"m1",label:"民众生还",description:"水、粮、医疗和撤离结果",initial:50},{id:"m2",label:"名字权利",description:"承担者是否被看见并能拒绝",initial:50},{id:"m3",label:"收成",description:"粮种与长期供水能力",initial:50},{id:"m4",label:"公共正当",description:"程序、授权和申诉",initial:50},{id:"m5",label:"神庭控制",description:"军事和神职垄断程度",initial:50}],
  resources:[{name:"净水",initial:"十二桶",rule:"每一桶只能去一个地方"},{name:"云闸",initial:"七座",rule:"故障、断骨和开闸均不可叙事恢复"},{name:"公开名册",initial:"残缺",rule:"保护隐私与追责必须同时设计"}],
  permanentFacts:["人物死亡、失能、监禁、碎裂与休眠均覆盖通用文案。","河闸损毁后不能凭神迹恢复。","见川获得或失去的拒绝权必须延续到结局。"],
  chapters:[{no:1,name:"最后十二桶水",range:"1至9"},{no:2,name:"被删掉的人",range:"10至18"},{no:3,name:"谁来认领灾难",range:"19至27"},{no:4,name:"旧神开口",range:"28至36"},{no:5,name:"审判仍要执行",range:"37至45"}],
  characters:[{id:"c1",name:"裴衡",role:"誓名院掌院",publicGoal:"完成借雨并维持三州水务",contradiction:"相信强制救援，却愿把自己的名字放在责任首位",bottomLine:"不伪造死亡数"},{id:"c2",name:"祝照临",role:"青芜代理人",publicGoal:"让承担者拥有知情和拒绝权",contradiction:"反对用人命证明立场，却总拿自己的病体换可信度",bottomLine:"不给拒签者断药"},{id:"c3",name:"商六问",role:"暗河商人与证人",publicGoal:"保护无名者和孩子的住处",contradiction:"奸诈逐利，却不出售儿童名单",bottomLine:"账可以交，床位不能交"},{id:"c4",name:"见川／阿缺",role:"动态旧神与新公民",publicGoal:"获得姓名、辞职权与外部审查",contradiction:"拥有控制雨势的能力，却首先要求可以说不",bottomLine:"拒绝被当作裴沅复活"}],
  acts:parseM02Acts(m02Text), endings:parseMarkdownEndings(m02Text,"m02"), audioPrinciples:["程序化水声、木声与钟声。","神迹越集中，节奏越机械；拒绝获得空间时，音乐留下停顿。"],
};

const structured = [];
for (const [file, extra] of [
  ["m03_data.mjs", { genre:"现实灾害", tone:"公共伦理", accent:"#73b7d5", actCount:42 }],
  ["m04_data.mjs", { genre:"奇幻多族", tone:"生态亲情", accent:"#c8d36e", actCount:50 }],
  ["m05_data.mjs", { genre:"古代穿越", tone:"家庭与制度", accent:"#d39a67", actCount:46 }],
]) {
  const source = (await import(`${pathToFileURL(path.join(contentDir, file)).href}?v=${Date.now()}`)).default;
  structured.push(mapStructuredWorld(source, extra));
}

const worlds = [m01, m02, ...structured];
for (const world of worlds) {
  if (world.acts.length !== world.actCount) throw new Error(`${world.id} act count mismatch: ${world.acts.length}/${world.actCount}`);
  if (world.endings.length !== 7) throw new Error(`${world.id} ending count mismatch: ${world.endings.length}/7`);
  for (const act of world.acts) {
    if (!act.choices.length) throw new Error(`${world.id} act ${act.no} has no choices or routes`);
  }
}

fs.writeFileSync(output, `${JSON.stringify(worlds)}\n`, "utf8");
console.log(JSON.stringify({ output, worlds: worlds.map((world) => ({ id:world.id, acts:world.acts.length, choices:world.acts.reduce((sum, act) => sum + act.choices.length, 0), endings:world.endings.length })) }, null, 2));
