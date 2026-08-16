"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  applyMediumChoice,
  buildWorldDossier,
  newMediumRun,
  relationLevel,
  restoreCheckpoint,
  storageKeys,
  validateMediumRun,
} from "./medium-world-engine";
import type { ContinuitySnapshot, MediumChoice, MediumRun, MediumWorld } from "./medium-world-types";
import { useAmbientAudio, type SceneCue } from "./use-ambient-audio";

type View = "intro" | "setup" | "game" | "ending";
type SaveSlot = { id: string; label: string; savedAt: number; run: MediumRun };

const WORLD_CUES: Record<string, SceneCue["scene"]> = {
  M01: "cold-storage",
  M02: "public-square",
  M03: "rain-tower",
  M04: "dragon-barrow",
  M05: "community-courtyard",
};

function download(filename: string, content: string, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).format(value);
}

function averageRelation(run: MediumRun, characterId: string) {
  const relation = run.relations[characterId];
  return Math.round(relation.trust * .45 + relation.affinity * .35 + relation.alignment * .2);
}

function actCue(world: MediumWorld, run: MediumRun | null): SceneCue {
  const progress = run ? run.actIndex / world.actCount : 0;
  const mood: SceneCue["mood"] = run?.endingId ? "aftermath" : progress > .72 ? "resolute" : progress > .38 ? "tense" : "uncertain";
  const intensity: 1 | 2 | 3 = progress > .7 ? 3 : progress > .28 ? 2 : 1;
  return { scene: WORLD_CUES[world.id] ?? "public-square", mood, intensity, actId: (run?.actIndex ?? 0) + 1 };
}

export default function MediumWorldPlayer({ world, scaleLabel = "中型世界", inheritance }: { world: MediumWorld; scaleLabel?: string; inheritance?: ContinuitySnapshot }) {
  const keys = useMemo(() => storageKeys(world.id), [world.id]);
  const [view, setView] = useState<View>("intro");
  const [run, setRun] = useState<MediumRun | null>(null);
  const [savedRun, setSavedRun] = useState<MediumRun | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [playerName, setPlayerName] = useState("岔路旅人");
  const [trait, setTrait] = useState(world.traits[0]);
  const [stance, setStance] = useState(world.stances[0]);
  const [fateHints, setFateHints] = useState<"light" | "standard" | "explicit">("standard");
  const [showResult, setShowResult] = useState(false);
  const [freeInput, setFreeInput] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [showExactRelations, setShowExactRelations] = useState(false);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const audio = useAmbientAudio(actCue(world, run));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const currentRaw = window.localStorage.getItem(keys.current);
        const parsed = currentRaw ? JSON.parse(currentRaw) : null;
        if (validateMediumRun(parsed, world)) setSavedRun(parsed);
        const slotsRaw = window.localStorage.getItem(keys.saves);
        const parsedSlots = slotsRaw ? JSON.parse(slotsRaw) : [];
        if (Array.isArray(parsedSlots)) setSlots(parsedSlots.filter((slot) => validateMediumRun(slot?.run, world)).slice(0, 12));
      } catch {
        setToast("发现无法读取的旧存档，当前版本没有覆盖它");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [keys, world]);

  useEffect(() => {
    if (!hydrated || !run) return;
    try {
      window.localStorage.setItem(keys.current, JSON.stringify(run));
      if (run.endingId) {
        const unlocked = JSON.parse(window.localStorage.getItem(keys.endings) ?? "[]") as string[];
        window.localStorage.setItem(keys.endings, JSON.stringify([...new Set([...unlocked, run.endingId])]));
      }
    } catch {
      window.queueMicrotask(() => setToast("浏览器未允许自动保存，请使用导出存档"));
    }
  }, [hydrated, keys, run]);

  const currentAct = run && !run.endingId ? world.acts[run.actIndex] : undefined;
  const ending = run?.endingId ? world.endings.find((item) => item.id === run.endingId) : undefined;
  const lastEvent = run?.events.at(-1);

  function startNew() {
    const next = newMediumRun(world, { name:playerName.trim() || "岔路旅人", trait, stance, fateHints }, inheritance);
    setRun(next);
    setView("game");
    setShowResult(false);
    setFreeInput("");
    void audio.startFromGesture();
  }

  function resume(source: MediumRun) {
    setRun(source);
    setView(source.endingId ? "ending" : "game");
    setShowResult(false);
    setFreeInput("");
    void audio.startFromGesture();
  }

  function choose(choice: MediumChoice, customInput?: string) {
    if (!run || !currentAct) return;
    try {
      const next = applyMediumChoice(run, world, choice.id, customInput);
      setRun(next);
      setShowResult(true);
      setFreeInput("");
      void audio.startFromGesture();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "这项行动暂时无法执行");
    }
  }

  function submitFreeInput() {
    if (!currentAct || !run) return;
    const text = freeInput.trim();
    if (text.length < 8) {
      setToast("请至少写清行动对象和具体做法");
      return;
    }
    choose(currentAct.choices[0], text.slice(0, 320));
  }

  function continueAfterResult() {
    if (run?.endingId) setView("ending");
    setShowResult(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function persistSlots(nextSlots: SaveSlot[]) {
    const limited = nextSlots.slice(0, 12);
    setSlots(limited);
    try { window.localStorage.setItem(keys.saves, JSON.stringify(limited)); } catch { setToast("保存槽写入失败，请导出存档"); }
  }

  function saveManual(label?: string) {
    if (!run) return;
    const slot: SaveSlot = { id:`slot-${Date.now()}`, label:label ?? `${world.id}｜第${Math.min(run.actIndex + 1, world.actCount)}幕`, savedAt:Date.now(), run };
    persistSlots([slot, ...slots]);
    setToast("已保存当前分支");
  }

  function loadSlot(slot: SaveSlot) {
    resume(slot.run);
    setSaveOpen(false);
    setToast(`已载入「${slot.label}」`);
  }

  function removeSlot(id: string) {
    if (!window.confirm("删除这个手动存档吗？当前自动存档不会受影响。")) return;
    persistSlots(slots.filter((slot) => slot.id !== id));
  }

  function exportSave() {
    if (!run) return;
    download(`平行人生存档_${world.id}_${run.branchId}.json`, JSON.stringify({ exportedAt:Date.now(), run, slots }, null, 2));
  }

  async function importSave(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { run?: unknown } | MediumRun;
      const candidate = "run" in parsed ? parsed.run : parsed;
      if (!validateMediumRun(candidate, world)) throw new Error("存档与本世界正史版本不匹配");
      resume(candidate);
      setSaveOpen(false);
      setToast("存档已校验并载入，原文件没有被覆盖");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "无法读取这个存档");
    }
  }

  function branchFromCheckpoint(checkpointId: string) {
    if (!run) return;
    saveManual(`${run.branchLabel}｜分支前备份`);
    const next = restoreCheckpoint(run, world, checkpointId);
    setRun(next);
    setView("game");
    setShowResult(false);
    setSaveOpen(false);
    setToast("已创建新分支，原分支保存在手动存档中");
  }

  function downloadDossier() {
    if (!run) return;
    download(`世界档案_${world.id}_${run.branchId}.md`, buildWorldDossier(run, world), "text/markdown;charset=utf-8");
  }

  function fateCopy() {
    if (!currentAct || !run) return "";
    if (run.player.fateHints === "light") return "有人会记住这次选择，影响会在后续回收。";
    if (run.player.fateHints === "explicit") return `相关人物：${currentAct.present.filter((name) => name !== "玩家" && name !== "你").join("、")}。当前风险：${currentAct.choices.map((choice) => choice.cost).join("；")}。`;
    return `相关人物：${currentAct.present.filter((name) => name !== "玩家" && name !== "你").join("、")}。风险涉及资源、关系、身份或不可逆事实。`;
  }

  if (view === "intro") {
    return (
      <main className="medium-shell" style={{ "--world-accent":world.accent } as CSSProperties}>
        <div className="medium-atmosphere" aria-hidden="true" />
        <nav className="medium-topbar">
          <Link href="/" className="medium-back">← 返回世界总览</Link>
          <span>{world.id} · {world.genre}</span>
          <button onClick={() => void audio.toggle()} aria-label="切换环境声音">{audio.enabled ? "声音已开" : "开启声音"}</button>
        </nav>

        <section className="medium-intro-hero">
          <p className="medium-kicker">{scaleLabel} · {world.actCount}幕 · {world.endings.length}种结局</p>
          <h1>{world.title}</h1>
          <p className="medium-lead">{world.oneLine}</p>
          <div className="medium-intro-actions">
            <button className="medium-primary" onClick={() => setView("setup")}>开始新的分支</button>
            {savedRun && <button className="medium-secondary" onClick={() => resume(savedRun)}>继续第{Math.min(savedRun.actIndex + 1, world.actCount)}幕</button>}
          </div>
        </section>

        <section className="medium-brief-grid">
          <article><span>你是谁</span><p>{world.player}</p><small>能力代价　{world.abilityCost}</small></article>
          <article><span>当前危机</span><p>{world.crisis}</p><small>第一项任务　{world.firstTask}</small></article>
        </section>

        {inheritance && <section className="medium-info-section">
          <header><span>00</span><h2>本分支会继承哪些旧故事</h2></header>
          <div className="medium-setup-summary"><span>正史快照 {inheritance.sourceHash}</span><p>已读取 {inheritance.completedSourceCount} 个已完成世界，其余使用明确标注的作者默认历史。开始本分支后，这份继承不会被后来改动的旧存档偷偷重写。</p></div>
          <div className="medium-term-grid">{inheritance.dynamicWitnesses.map((witness) => <article key={witness.slot}><h3>{witness.name}</h3><p>{witness.role}</p><small>{witness.representation} · 来自 {witness.sourceWorldId}　{witness.reason}</small></article>)}</div>
        </section>}

        <section className="medium-info-section">
          <header><span>01</span><h2>冲突中的三方</h2></header>
          <div className="medium-faction-grid">{world.factions.map((faction) => <article key={faction.name}><h3>{faction.name}</h3><strong>{faction.want}</strong><p>{faction.reason}</p><small>代价落向　{faction.cost}</small></article>)}</div>
        </section>

        <section className="medium-info-section">
          <header><span>02</span><h2>开始前必须知道</h2></header>
          <div className="medium-term-grid">{world.terms.slice(0, 6).map((term) => <article key={term.name}><h3>{term.name}</h3><p>{term.meaning}</p><small>{term.relevance}</small></article>)}</div>
        </section>

        <section className="medium-info-section medium-rule-section">
          <header><span>03</span><h2>不会为剧情方便而改变的规则</h2></header>
          <ol>{world.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
        </section>
        {toast && <button className="medium-toast" onClick={() => setToast("")}>{toast}</button>}
      </main>
    );
  }

  if (view === "setup") {
    return (
      <main className="medium-shell medium-setup" style={{ "--world-accent":world.accent } as CSSProperties}>
        <nav className="medium-topbar"><button className="medium-back" onClick={() => setView("intro")}>← 返回世界介绍</button><span>建立你的分支</span><i /></nav>
        <section className="medium-setup-card">
          <p className="medium-kicker">{world.id} · 玩家设置</p>
          <h1>你会以什么方式进入这个世界</h1>
          <label className="medium-name-field"><span>你的称呼</span><input value={playerName} onChange={(event) => setPlayerName(event.target.value.slice(0, 18))} /></label>
          <fieldset><legend>选择一项特长</legend><div className="medium-option-grid">{world.traits.map((item) => <button type="button" className={trait === item ? "selected" : ""} onClick={() => setTrait(item)} key={item}><strong>{item}</strong><span>每章首次相关行动会得到额外帮助</span></button>)}</div></fieldset>
          <fieldset><legend>你的初始立场</legend><div className="medium-option-grid">{world.stances.map((item) => <button type="button" className={stance === item ? "selected" : ""} onClick={() => setStance(item)} key={item}><strong>{item}</strong><span>立场影响初始指标，不锁定后续选择</span></button>)}</div></fieldset>
          <fieldset><legend>人物命运提示</legend><div className="medium-option-grid compact">{(["light","standard","explicit"] as const).map((id) => <button type="button" className={fateHints === id ? "selected" : ""} onClick={() => setFateHints(id)} key={id}><strong>{id === "light" ? "轻度" : id === "standard" ? "标准" : "明显"}</strong><span>{id === "light" ? "只提示有人会记住" : id === "standard" ? "提示人物与风险类型" : "直接列出已知风险"}</span></button>)}</div></fieldset>
          <div className="medium-setup-summary"><span>有限能力</span><p>{world.ability}</p><small>固定过去　{world.fixedPast}</small></div>
          <button className="medium-primary medium-start" onClick={startNew}>进入第一幕</button>
        </section>
      </main>
    );
  }

  if (view === "ending" && run && ending) {
    return (
      <main className="medium-shell medium-ending" style={{ "--world-accent":world.accent } as CSSProperties}>
        <nav className="medium-topbar"><Link href="/" className="medium-back">← 返回世界总览</Link><span>{world.id} · 本局结束</span><button onClick={() => setSaveOpen(true)}>存档与分支</button></nav>
        <section className="medium-ending-hero"><p className="medium-kicker">{ending.hidden ? "隐藏结局" : "正式结局"}</p><h1>{ending.name}</h1><p>{ending.scene || ending.world}</p></section>
        <section className="medium-ending-report">
          <article><span>世界结果</span><p>{ending.world}</p></article>
          <article><span>你支付的代价</span><p>{ending.playerCost}</p></article>
          <article><span>关键因果链</span><ol>{ending.causes.map((cause) => <li key={cause}>{cause}</li>)}</ol></article>
        </section>
        <section className="medium-ending-people"><header><span>人物后日谈</span><h2>关系没有替任何人取消责任</h2></header><div>{ending.epilogues.map((card, index) => <article key={`${card.status}-${index}`}><div><span>{index === 0 ? "你" : world.characters[index - 1]?.name ?? `人物${index}`}</span><em>{card.status}</em></div><h3>{card.where}</h3><p>{card.choice}</p><small>代价　{card.cost}</small>{card.lastLine && <blockquote>“{card.lastLine.replace(/^“|”$/g, "")}”</blockquote>}</article>)}</div></section>
        <section className="medium-ending-actions"><button className="medium-primary" onClick={downloadDossier}>下载本局世界档案</button><button className="medium-secondary" onClick={exportSave}>导出可重复读档文件</button><button className="medium-secondary" onClick={() => setView("setup")}>开始新人生</button></section>
        {saveOpen && renderSaveDialog()}
        {toast && <button className="medium-toast" onClick={() => setToast("")}>{toast}</button>}
      </main>
    );
  }

  if (showResult && run && lastEvent) {
    return (
      <main className="medium-shell medium-result" style={{ "--world-accent":world.accent } as CSSProperties}>
        <section className="medium-result-card">
          <p className="medium-kicker">第{lastEvent.actNo}幕已经成为正史</p>
          <h1>{lastEvent.choiceTitle}</h1>
          {lastEvent.customInput && <blockquote>{lastEvent.customInput}</blockquote>}
          <p>{lastEvent.result}</p>
          <div className="medium-delta-grid">{Object.entries(lastEvent.metricDeltas).map(([id, delta]) => <span key={id}>{world.metrics.find((metric) => metric.id === id)?.label ?? id}　{delta > 0 ? "+" : ""}{delta}</span>)}</div>
          <small>永久记录已写入，人物仍会按自己的目标行动。</small>
          <button className="medium-primary" onClick={continueAfterResult}>{run.endingId ? "查看本局结局" : `进入第${run.actIndex + 1}幕`}</button>
        </section>
      </main>
    );
  }

  if (!run || !currentAct) return null;

  return (
    <main className="medium-shell medium-game" style={{ "--world-accent":world.accent } as CSSProperties}>
      <nav className="medium-game-nav">
        <Link href="/" className="medium-back">人生岔路</Link>
        <div><span>{world.id}</span><strong>{world.title}</strong></div>
        <div className="medium-nav-actions"><button onClick={() => { saveManual(); setSaveOpen(true); }}>保存／读档</button><button onClick={() => void audio.toggle()}>{audio.enabled ? "声音开启" : "开启声音"}</button></div>
      </nav>

      <div className="medium-progress"><i style={{ width:`${((run.actIndex + 1) / world.actCount) * 100}%` }} /><span>{run.actIndex + 1} / {world.actCount}</span></div>

      <div className="medium-game-layout">
        <aside className="medium-status-panel">
          <section><header><span>世界状态</span><small>{run.branchLabel}</small></header>{world.metrics.map((metric) => <div className="medium-meter" key={metric.id}><label><span>{metric.label}</span><strong>{run.metrics[metric.id]}</strong></label><i><b style={{ width:`${run.metrics[metric.id]}%` }} /></i><small>{metric.description}</small></div>)}</section>
          <section><header><span>人物关系</span><button onClick={() => setShowExactRelations((value) => !value)}>{showExactRelations ? "隐藏数值" : "查看详情"}</button></header>{world.characters.map((character) => { const relation = run.relations[character.id]; return <article className="medium-relation" key={character.id}><div><strong>{character.name}</strong><span>{relationLevel(relation)}</span></div><small>{character.role}</small>{showExactRelations && <p>信任 {relation.trust}　亲近 {relation.affinity}　立场 {relation.alignment}</p>}<i><b style={{ width:`${averageRelation(run, character.id)}%` }} /></i></article>; })}</section>
          <section className="medium-ledger"><header><span>执行账</span></header><p>世界压力 <strong>{run.pressure}</strong></p><p>真相完整 <strong>{run.truth}</strong></p><p>资源负担 <strong>{run.resourceStrain}</strong></p></section>
        </aside>

        <article className="medium-story-stage">
          <header className="medium-act-heading"><p>{currentAct.chapter}</p><span>{currentAct.time} · {currentAct.location}</span><h1><small>第{currentAct.no}幕</small>{currentAct.title}</h1></header>
          <section className="medium-act-task"><span>当前任务</span><p>{currentAct.objective}</p><strong>当前冲突　{currentAct.conflict}</strong></section>
          {currentAct.prelude && <aside className="medium-act-prelude"><span>此前选择已经改变现场</span><p>{currentAct.prelude}</p></aside>}
          <section className="medium-prose">{currentAct.prose.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>
          {currentAct.dialogue && <blockquote className="medium-dialogue">{currentAct.dialogue}</blockquote>}
          {currentAct.clue && <aside className="medium-clue"><span>可追查线索</span><p>{currentAct.clue}</p></aside>}
          <aside className="medium-fate"><span>命运提示</span><p>{fateCopy()}</p></aside>

          <section className="medium-choices"><header><span>作出选择</span><small>字母位置不代表价值或正确答案</small></header>{currentAct.choices.map((choice, index) => <button onClick={() => choose(choice)} key={choice.id}><i>{String.fromCharCode(65 + index)}</i><div><strong>{choice.action}</strong><span>收益　{choice.benefit}</span><small>代价　{choice.cost}</small></div></button>)}</section>

          {currentAct.freeInput && <section className="medium-free-input"><header><span>关键节点 · 可自由行动</span><small>自由输入不能绕过资源、人物底线或已发生事实</small></header><p>{currentAct.freePrompt}</p><textarea value={freeInput} onChange={(event) => setFreeInput(event.target.value.slice(0, 320))} placeholder="例如：先说明由谁执行，再写清资源来源、承担者和停止条件……" /><div><span>{freeInput.length}/320</span><button onClick={submitFreeInput}>提交自由行动</button></div></section>}

          <footer className="medium-act-footer"><span>下一幕钩子</span><p>{currentAct.hook}</p><small>声景　{currentAct.music}</small></footer>
        </article>

        <aside className="medium-history-panel">
          <header><span>分支记录</span><small>{run.events.length}项选择</small></header>
          {run.events.length ? run.events.slice(-6).reverse().map((event) => <article key={`${event.actNo}-${event.choiceId}`}><span>第{event.actNo}幕</span><strong>{event.choiceTitle}</strong><small>{event.result}</small></article>) : <p>你的第一项决定尚未写入。</p>}
          <div className="medium-current-echo"><span>世界回声</span><p>{currentAct.echo || "人物会在一至两幕内继续自己的计划。"}</p></div>
        </aside>
      </div>
      {saveOpen && renderSaveDialog()}
      {toast && <button className="medium-toast" onClick={() => setToast("")}>{toast}</button>}
    </main>
  );

  function renderSaveDialog() {
    return <div className="medium-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSaveOpen(false); }}><section className="medium-save-dialog" role="dialog" aria-modal="true" aria-label="保存与读档"><header><div><span>保存与读档</span><h2>{run?.branchLabel ?? world.title}</h2></div><button onClick={() => setSaveOpen(false)} aria-label="关闭">×</button></header><div className="medium-save-actions"><button onClick={() => saveManual()}>保存当前分支</button><button onClick={exportSave}>导出 JSON</button><button onClick={() => importRef.current?.click()}>导入存档</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => { void importSave(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div>{run?.checkpoints.length ? <section><h3>章节检查点</h3><div className="medium-checkpoint-list">{run.checkpoints.map((checkpoint) => <button key={checkpoint.id} onClick={() => branchFromCheckpoint(checkpoint.id)}><strong>{checkpoint.label}</strong><span>从第{checkpoint.actIndex + 1}幕创建新分支</span><small>{formatTime(checkpoint.savedAt)}</small></button>)}</div></section> : null}<section><h3>手动存档</h3>{slots.length ? <div className="medium-slot-list">{slots.map((slot) => <article key={slot.id}><button onClick={() => loadSlot(slot)}><strong>{slot.label}</strong><span>第{Math.min(slot.run.actIndex + 1, world.actCount)}幕 · {slot.run.branchLabel}</span><small>{formatTime(slot.savedAt)}</small></button><button onClick={() => removeSlot(slot.id)} aria-label={`删除${slot.label}`}>删除</button></article>)}</div> : <p className="medium-empty-save">还没有手动存档。每次选择后仍会自动保存。</p>}</section></section></div>;
  }
}
