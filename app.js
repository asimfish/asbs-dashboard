"use strict";
(() => {
  const labels={verified:"已验证",partial:"条件证据",failed:"未通过",planned:"未开始",running:"运行中",succeeded:"执行完成",error:"执行失败",blocked:"前置阻塞",skipped:"未执行"};
  const $=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
  const pill=status=>node("span",labels[status]||"未知",`pill ${Object.hasOwn(labels,status)?status:"planned"}`);
  const list=(id,rows,render)=>$(id).replaceChildren(...rows.map(render));
  const time=iso=>{const date=new Date(iso);return Number.isFinite(date.getTime())?date.toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})+" UTC+8":"未记录";};
  let latest=null,fetchFailed=false;
  function freshness(failed=fetchFailed){
    const age=latest?Date.now()-Date.parse(latest.generated_utc):Infinity;
    const stale=failed||!Number.isFinite(age)||age>600000||age< -120000;
    $("freshness").className=stale?"stale":"";
    $("freshness").textContent=stale?"快照过期或更新不可达：以下是最后已知状态，不代表进程仍在运行。":"快照新鲜；仍须以任务回执和科学指标判断结果。";
  }
  function render(data){
    if(!data||data.schema_version!==1||!data.content)throw new Error("snapshot schema mismatch");
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
    const findings=data.findings||{};$("findings-time").textContent=findings.observed_utc?"指标汇总于 "+time(findings.observed_utc)+"；运行回执每分钟更新，指标约每30分钟汇总。":"尚无正式结果。";
    list("findings",findings.rows||[],x=>{const el=node("article",undefined,"card");el.append(pill(x.status),node("h3",x.name),node("p",x.result),node("p",x.boundary,"boundary"));return el;});
    list("resources",r.resources||[],x=>{const el=node("article",undefined,"resource");el.append(node("b",x.name),node("p",x.summary),node("p","采集时间："+time(x.observed_utc)));return el;});
    freshness();
  }
  async function refresh(){try{const endpoint=document.querySelector('meta[name="snapshot-source"]')?.content||"status.json";const response=await fetch(endpoint+"?v="+Date.now(),{cache:"no-store"});if(!response.ok)throw new Error("snapshot unavailable");const data=await response.json();render(data);fetchFailed=false;freshness();}catch(_){if(!latest&&window.ASBS_SNAPSHOT)render(window.ASBS_SNAPSHOT);fetchFailed=location.protocol!=="file:";freshness();}}
  $("refresh").addEventListener("click",refresh);
  if(window.ASBS_SNAPSHOT)render(window.ASBS_SNAPSHOT);
  refresh();setInterval(refresh,60000);setInterval(()=>freshness(),30000);
})();
