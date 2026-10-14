"use strict";
(() => {
  const labels={verified:"已验证",partial:"部分证据",failed:"未通过",planned:"待实施",queued:"已排队",implemented:"已实现",tested:"机制已测试",insufficient:"样本不足",reference:"参照",running:"运行中",succeeded:"执行完成",error:"执行失败",blocked:"前置阻塞",skipped:"未执行"};
  const $=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
  const pill=status=>node("span",labels[status]||"未知",`pill ${Object.hasOwn(labels,status)?status:"planned"}`);
  const list=(id,rows,render)=>$(id).replaceChildren(...rows.map(render));
  const time=iso=>{if(!iso)return "未记录";const date=new Date(iso);return Number.isFinite(date.getTime())?date.toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})+" UTC+8":"未记录";};
  let latest=null,fetchFailed=false;
  const metric=value=>typeof value==="number"&&Number.isFinite(value)?(value===0?"0":value.toExponential(3)):"未报告";
  const count=value=>typeof value==="number"&&Number.isFinite(value)?String(value):"未报告";
  const percent=value=>typeof value==="number"&&Number.isFinite(value)?(value>0?"+":"")+(value*100).toFixed(1)+"%":"未报告";
  function researchFreshness(failed){
    const research=latest?.research;if(!research)return;
    const c=research.closed_loop,age=Date.now()-Date.parse(c.observed_utc);
    const active=["running","queued"].includes(c.status),stale=failed||!Number.isFinite(age)||age< -120000||(active&&age>600000);
    $("research-freshness").className=stale?"stale":"";
    $("research-freshness").textContent=stale?"当前回执缺失、过期或读取失败：保留最后已知值，不推断任务仍在运行。":active?"运行进度来自最近回执；页面每 60 秒读取一次公开快照。":"显示最近一次实验回执；后续实验状态以新的回执为准。";
  }
  function freshness(failed=fetchFailed){
    const age=latest?Date.now()-Date.parse(latest.generated_utc):Infinity;
    const stale=failed||!Number.isFinite(age)||age>600000||age< -120000;
    $("freshness").className=stale?"stale":"";
    $("freshness").textContent=stale?"快照过期或更新不可达：以下是最后已知状态，不代表进程仍在运行。":"快照新鲜；仍须以任务回执和科学指标判断结果。";
    researchFreshness(failed);
  }
  function renderResearch(research){
    if(!research)return;
    if(research.schema_version!==1||!research.offline||!research.closed_loop)throw new Error("research schema mismatch");
    const off=research.offline,c=research.closed_loop,d=research.design;
    $("research-observed").textContent="闭环回执 "+time(c.observed_utc)+" · 离线结果 "+time(off.observed_utc)+"；快照生成时间不替代实验观测时间。";
    const state=$("closed-loop-status");state.replaceChildren(pill(c.status),node("strong"," "+count(c.completed_episodes)+" / "+c.expected_episodes+" 回合"),node("p",c.summary));
    $("closed-loop-boundary").textContent=c.boundary;
    list("closed-loop-rows",c.per_arm,row=>{const tr=node("tr");tr.append(node("th",row.label),node("td",count(row.completed)+" / 8"),node("td",row.successes===null?"未报告":count(row.successes)+" / "+count(row.completed)),node("td",metric(row.mean_command_energy)),node("td",row.mean_episode_steps===null?"未报告":row.mean_episode_steps.toFixed(1)));tr.firstChild.scope="row";return tr;});
    $("paired-results").replaceChildren(...(c.paired_summary.length?c.paired_summary.map(row=>node("p",row.label+" − 原生："+row.pairs+" 对初态，成功率差 "+percent(row.success_delta)+"；命令能量差 "+metric(row.mean_command_energy_delta)+"。")):[node("p","尚无完整配对对比；缺失结果不填零。") ]));
    $("offline-scope").textContent=off.task_count+" 个任务 · "+off.train_states+" 个训练状态 + "+off.validation_states+" 个开发验证状态 · "+off.head_trainable_parameters.toLocaleString("en-US")+" 个原动作头参数。";
    list("offline-summary",[["ASBS 适配器 vs 原生",off.relative_changes.sampler_vs_native],["ASBS 动作头 vs 原模型",off.relative_changes.head_vs_original],["ASBS 动作头 vs 原生目标微调",off.relative_changes.head_vs_native_fit]],item=>{const el=node("article",undefined,"card");el.append(node("h3",item[0]),node("strong",percent(item[1]),item[1]>0?"negative-result":""),node("p","v6 的任务宏平均命令能量相对变化"));return el;});
    const rows=[];for(const rev of off.revisions){for(const row of [...rev.per_task,{task:"宏平均",sampler:rev.sampler,heads:rev.heads}]){const tr=node("tr");tr.append(node("th",rev.version+" / "+row.task));tr.firstChild.scope="row";for(const value of [row.sampler.native,row.sampler.asbs,row.sampler.gaussian,row.sampler.rwr,row.heads.head_original_energy,row.heads.head_native_fit_energy,row.heads.head_asbs_fit_energy])tr.append(node("td",metric(value)));rows.push(tr);}}
    $("offline-rows").replaceChildren(...rows);list("research-boundaries",off.boundaries,item=>node("li",item));
    $("design-implemented").textContent=d.implemented;$("design-teacher").textContent=d.teacher;
    list("design-flow",d.steps,item=>{const el=node("li",undefined,"flow-item");el.append(pill(item.status),node("h3",item.title),node("p",item.detail));return el;});
    list("module-rows",c.modules,item=>{const tr=node("tr"),path=node("th"),state=node("td");path.scope="row";path.append(node("code",item.path));state.append(pill(item.status));tr.append(path,node("td",item.purpose),state);return tr;});
    $("module-tests").textContent=c.mechanism_tests===null?"本轮模块测试回执尚未报告。":"本轮模块机制检查："+c.mechanism_tests+" 项通过；不等于任务收益或安全能力通过。";
  }
  function render(data){
    if(!data||data.schema_version!==1||!data.content)throw new Error("snapshot schema mismatch");
    if(data.research&&(data.research.schema_version!==1||!data.research.offline||!data.research.closed_loop))throw new Error("research schema mismatch");
    latest=data;const c=data.content,r=data.runtime||{};
    $("subtitle").textContent=c.subtitle;$("version").textContent=c.proposal_version;
    $("updated").textContent="快照 "+time(data.generated_utc);$("verdict").textContent=c.verdict;$("goal").textContent=c.goal;
    $("proposal-hash").textContent="方案 SHA256 · "+data.proposal_sha256.slice(0,16);$("footer-task").textContent=c.current_task;
    list("focus",c.focus,x=>node("li",x));list("maintenance-list",c.maintenance,x=>node("li",x));
    list("flow",c.method,x=>{const el=node("div",undefined,"flow-item");el.append(node("b",x.name),node("p",x.detail));return el;});
    list("milestone-grid",c.milestones,x=>{const el=node("article",undefined,"card");el.append(pill(x.status),node("h3",x.id+" / "+x.title),node("p",x.summary),node("p",x.boundary,"boundary"),node("p",x.evidence,"source"));return el;});
    list("evidence-rows",c.evidence,x=>{const tr=node("tr");const detail=node("td",x.scope);detail.append(node("p",x.source));const state=node("td");state.append(pill(x.status));tr.append(node("td",x.topic),node("td",x.result),state,detail);return tr;});
    list("hypothesis-grid",c.hypotheses,x=>{const el=node("article",undefined,"card");el.append(node("span",x.id,"muted"),node("h3",x.question),node("p",x.experiment),node("p","否定信号："+x.falsifier,"boundary"));return el;});
    list("decision-list",c.decisions,x=>{const el=node("div",undefined,"decision");el.append(node("small",x.date),node("strong",x.title),node("p",x.detail));return el;});
    $("campaign-meta").textContent=r.started_utc?`开始 ${time(r.started_utc)} · 硬截止 ${time(r.deadline_utc)} · ${r.summary||"科学结果仍待审查"}`:(r.summary||"尚未启动：协议与环境验收中。8 小时从第一项正式实验启动计时。");
    const counts=r.counts||{running:0,succeeded:0,error:0,pending:0};
    list("counters",[["运行中",counts.running],["执行完成（非科学通过）",counts.succeeded],["失败 / 超时",counts.error],["排队 / 阻塞",counts.pending]],x=>{const el=node("div",undefined,"counter");el.append(node("strong",x[1]??0),node("span",x[0]));return el;});
    list("jobs",r.jobs||[],x=>{const tr=node("tr");const state=node("td");state.append(pill(x.status));tr.append(node("td",x.name),node("td",x.question),state,node("td",x.verdict||"未判定"));return tr;});
    if(!(r.jobs||[]).length){const tr=node("tr"),td=node("td","尚无登记运行；不显示虚构进度。");td.colSpan=4;tr.append(td);$("jobs").append(tr);}
    const findings=data.findings||{};$("findings-time").textContent=findings.observed_utc?"历史指标汇总于 "+time(findings.observed_utc)+"；以下不表示当前实验状态。":"历史指标未记录汇总时间。";
    list("findings",findings.rows||[],x=>{const el=node("article",undefined,"card");el.append(pill(x.status),node("h3",x.name),node("p",x.result),node("p",x.boundary,"boundary"));return el;});
    list("resources",r.resources||[],x=>{const el=node("article",undefined,"resource");el.append(node("b",x.name),node("p",x.summary),node("p","采集时间："+time(x.observed_utc)));return el;});
    renderResearch(data.research);freshness();
  }
  async function refresh(){try{const endpoint=document.querySelector('meta[name="snapshot-source"]')?.content||"status.json";const response=await fetch(endpoint+"?v="+Date.now(),{cache:"no-store"});if(!response.ok)throw new Error("snapshot unavailable");const data=await response.json();render(data);fetchFailed=false;freshness();}catch(_){if(!latest&&window.ASBS_SNAPSHOT)render(window.ASBS_SNAPSHOT);fetchFailed=location.protocol!=="file:";freshness();}}
  $("refresh").addEventListener("click",refresh);
  if(window.ASBS_SNAPSHOT)render(window.ASBS_SNAPSHOT);
  refresh();setInterval(refresh,60000);setInterval(()=>freshness(),30000);
})();
