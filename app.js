"use strict";
(() => {
  const labels={verified:"已验证",verification_pending:"结果待核验",partial:"部分证据",failed:"未通过",planned:"待实施",queued:"已排队",implemented:"已实现",tested:"机制已测试",insufficient:"样本不足",reference:"参照",running:"运行中",succeeded:"执行完成",error:"执行失败",blocked:"前置阻塞",skipped:"未执行"};
  const $=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
  const pill=status=>node("span",labels[status]||"未知",`pill ${Object.hasOwn(labels,status)?status:"planned"}`);
  const list=(id,rows,render)=>$(id).replaceChildren(...rows.map(render));
  const time=iso=>{if(!iso)return "未记录";const date=new Date(iso);return Number.isFinite(date.getTime())?date.toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})+" UTC+8":"未记录";};
  let latest=null,fetchFailed=false,sourceDegraded=false,refreshing=false,nextAttempt=0,apiRetryAt=0;
  const refreshInterval=90000;
  const metric=value=>typeof value==="number"&&Number.isFinite(value)?(value===0?"0":value.toExponential(3)):"未报告";
  const count=value=>typeof value==="number"&&Number.isFinite(value)?String(value):"未报告";
  const percent=value=>typeof value==="number"&&Number.isFinite(value)?(value>0?"+":"")+(value*100).toFixed(1)+"%":"未报告";
  function researchFreshness(failed){
    const research=latest?.research;if(!research)return;
    const c=research.closed_loop,age=Date.now()-Date.parse(c.observed_utc);
    const active=["running","queued"].includes(c.status),stale=failed||sourceDegraded||!Number.isFinite(age)||age< -120000||(active&&age>600000);
    $("research-freshness").className=stale?"stale":"";
    $("research-freshness").textContent=stale?"当前回执缺失、过期或更新渠道异常：保留最后已知值，不推断任务仍在运行。":active?"运行进度来自最近回执；页面每 90 秒查询公开数据接口，接口缓存可能带来额外延迟。":"显示最近一次实验回执；后续实验状态以新的回执为准。";
    const standard=research.standard_eval;
    if(standard){
      const elapsed=Date.now()-Date.parse(standard.observed_utc),running=standard.status==="running";
      const outdated=failed||sourceDegraded||!Number.isFinite(elapsed)||elapsed< -120000||(running&&elapsed>600000);
      $("standard-freshness").className=outdated?"stale":"";
      $("standard-freshness").textContent=outdated?"标准评估回执缺失、过期或更新渠道异常：保留最后已知值；不据此推断仍在运行。":running?"标准评估按最近回执更新，页面每 90 秒查询；缓存可能带来额外延迟。":"显示最近一次标准评估回执；计划数与观测数分别列出。";
    }
  }
  function freshness(failed=fetchFailed){
    const age=latest?Date.now()-Date.parse(latest.generated_utc):Infinity;
    const stale=failed||sourceDegraded||!Number.isFinite(age)||age>600000||age< -120000;
    $("freshness").className=stale?"stale":"";
    $("freshness").textContent=sourceDegraded?"主要更新接口不可达或受限：当前保留备用或最后已知快照，不能保证最新。":stale?"快照过期或更新不可达：以下是最后已知状态，不代表进程仍在运行。":"快照在有效时间范围内；仍须以回执时间和科学指标判断结果。";
    researchFreshness(failed);
  }
  function renderStandard(s){
    if(!s){$("standard-status").textContent="尚无标准评估协议与回执。";return;}
    $("standard-observed").textContent="标准评估回执 "+time(s.observed_utc)+"；与早期小样本试验分别记录。";
    $("standard-status").replaceChildren(pill(s.status),node("p",s.summary));
    const values=[["已观测任务 / 计划任务",count(s.coverage.observed_tasks)+" / "+s.task_count],
      ["已观测独立初态 / 计划初态",count(s.coverage.observed_unique_starts)+" / "+s.unique_starts],
      ["有效回合 / 计划回合",count(s.completed_episodes)+" / "+s.expected_episodes],
      ["执行错误（单列）",count(s.errors)],["评估重复次数（协议）",s.eval_repeats],["本轮新增训练种子",s.training_seeds]];
    list("standard-counts",values,item=>{const el=node("article",undefined,"card");el.append(node("p",item[0]),node("strong",item[1]));return el;});
    $("standard-result").textContent=s.complete&&s.success_rate!==null?"完整 Spatial 基线成功率："+(s.success_rate*100).toFixed(1)+"%（"+s.successes+" / "+s.completed_episodes+"；10 任务等权）。尚无 ASBS 对照结果。":"完整套件成功率：未报告；当前批次未完整核验，不将部分回合升级为正式结果。";
    $("standard-boundary").textContent=s.boundary;
    list("standard-task-rows",s.per_task,row=>{const tr=node("tr");tr.append(node("th","Spatial / "+row.task_id),node("td",count(row.completed)+" / "+s.init_per_task),node("td",row.successes===null?"未报告":count(row.successes)+" / "+count(row.completed)),node("td",count(row.errors)));tr.firstChild.scope="row";return tr;});
    list("standard-plan-rows",s.standard_plan,row=>{const tr=node("tr");tr.append(node("th",row.label),node("td",row.tasks),node("td",row.starts_per_task),node("td",row.episodes_per_model),node("td",row.horizon));tr.firstChild.scope="row";return tr;});
    for(const [id,key] of [["standard-seeds","seed_plan"],["standard-settings","settings"],["standard-pilot","pilot_boundary"],["standard-checkpoint","checkpoint_boundary"]])$(id).textContent=s[key];
  }
  function renderRoboDojo(r){
    if(!r){$("robodojo-summary").textContent="尚无迁移协议回执。";return;}
    $("robodojo-observed").textContent=(r.observation_label||"协议检查回执")+" "+time(r.observed_utc)+"；仿真完成量以回合记录为准。";
    for(const key of ["summary","boundary","retention"])$("robodojo-"+key).textContent=r[key];
    list("robodojo-pilot-rows",r.native_pilot?.per_task||[],row=>{const tr=node("tr");tr.append(node("th",row.task),node("td",row.completed+" / 2"),node("td",row.successes+" / "+row.completed),node("td",Number(row.mean_score).toFixed(3)));tr.firstChild.scope="row";return tr;});
    list("robodojo-p0-rows",r.p0_diagnostic?.per_task_arm||[],row=>{const tr=node("tr");tr.append(node("th",row.task+" / "+row.arm),node("td",row.completed+" / 2"),node("td",row.successes==null?"未回收":row.successes+" / "+row.completed),node("td",row.mean_score==null?"—":Number(row.mean_score).toFixed(3)));tr.firstChild.scope="row";return tr;});
    list("robodojo-p0-v2-rows",r.p0_successor?.per_case||[],row=>{const tr=node("tr");tr.append(node("th",row.task+" / "+row.arm),node("td",row.validated?"PASS":"ERROR"),node("td",row.success==null?"未回收":String(row.success)+" / "+Number(row.score).toFixed(3)),node("td",row.controls==null?"—":row.controls+" / "+row.model_calls));tr.firstChild.scope="row";return tr;});
    list("robodojo-p1-rows",r.p1_correction?.cases||[],row=>{const tr=node("tr");tr.append(node("th",row.task+" / "+row.arm),node("td",row.success==null?"执行错误 / 未取得结果":String(row.success)+" / "+Number(row.score).toFixed(3)),node("td",row.handoff_category+" / "+(row.student_after_controls??"未知")+"步"),node("td",[row.controls,row.model_forwards,row.teacher_controls,row.ik_requests].map(x=>x??"未知").join(" / ")));tr.firstChild.scope="row";return tr;});
    list("robodojo-p1-qualification-rows",r.p1_qualification?.cases||[],row=>{const tr=node("tr");tr.append(node("th",row.arm+" / "+row.status),node("td",row.success==null?"未取得任务结果":String(row.success)+" / "+Number(row.score).toFixed(3)),node("td",(row.teacher_status?.failure??row.handoff_category??"未运行")+" / "+(row.student_after_controls??"未知")+"步"),node("td",[row.controls,row.model_forwards,row.teacher_controls,row.ik_requests].map(x=>x??"未知").join(" / ")));tr.firstChild.scope="row";return tr;});
    list("robodojo-stages",r.stages,row=>{const tr=node("tr"),state=node("td");state.append(pill(row.status));tr.append(node("th",row.name),node("td",row.scale),node("td",row.question),state);tr.firstChild.scope="row";return tr;});
    $("robodojo-demo-plan-summary").textContent=r.p1_demo_plan?"T1004 示教依据与规划规格准备：3条官方开发示教、24条SPEC_ONLY候选、0条已标定可执行。新增物理/模型/IK/GPU作业均0；下一资格协议未放行，教师能力仍未合格。":"尚无新的示教规划回执。";
    $("robodojo-contact-summary").textContent=r.p1_contact?"T1005 当前几何接触资格："+r.p1_contact.status+"；局部抓取 "+r.p1_contact.local_grasp_status+"，两碗原语 "+r.p1_contact.two_bowl_primitive_status+"。"+(r.p1_contact.grasp_evidence?"共动："+r.p1_contact.grasp_evidence.co_motion_passed+"，相对稳定："+r.p1_contact.grasp_evidence.relative_stability_passed+"，抬升窗口："+r.p1_contact.grasp_evidence.lift_height_window_passed+"；变换资格："+r.p1_contact.grasp_evidence.accepted_grasp+"。":"")+"VLA/训练/provider为0，提前诊断退出没有官方最终Success/Score。":"尚无单次接触资格回执。";
    $("robodojo-contact-diagnosis").textContent=r.p1_contact_diagnosis?"T1006 已有118控制轨迹诊断：旧窗114–118中114/115高度不足，116首次达标；真实持姿验证0控制。仅CPU文件回收/时序测试，后继物理NOT_RUN，T1005仍未通过；没有学生/ASBS结论。":"尚无完整轨迹诊断回执。";
    $("robodojo-contact-observation").textContent=r.p1_contact_observation?"T1007 observation-v2："+r.p1_contact_observation.phase+" / "+r.p1_contact_observation.status+"；实例观测门 "+r.p1_contact_observation.local_observation_pass+"，两碗原语 "+(r.p1_contact_observation.two_bowl_primitive_status||"NOT_YET_VERIFIED")+"。新reset、新OBB/持姿合同；不是同状态因果比较或学生/ASBS结果。":"单次observation-v2尚无回执。";
    $("robodojo-prepared-continuation").textContent=r.prepared_continuation?"T1008 "+r.prepared_continuation.phase+"："+r.prepared_continuation.arms.map(a=>a.arm+" / "+a.status+" / release="+(a.prepared_gate_pass==null?"N/A":a.prepared_gate_pass)+" / Success="+a.official_success+" / Score="+a.official_score+" / student controls="+a.student_controls).join("；")+"。prepared-state探针，非失败恢复/ASBS。cached transition分数不代表当前几何稳定。":"尚无prepared-state学生续执行回执。";
    $("robodojo-prepared-diagnosis").textContent=r.prepared_diagnosis?"T1009 只读诊断：1590控制、27次最新state匹配、11组同序号RNG一致（非noise字节验证）。A根xy/dz配对保持160..800、姿态资格间歇失去；三碗几何始终未过。B725..790几何代理满足，790官方成功。不是只差home；不支持不同seed/历史丢失解释；时长与交接状态效应仍未知。该阶段新物理/模型/训练0；W草案已否决，新D另列。":"尚无prepared-state轨迹只读诊断。";
    $("robodojo-prepared-horizon").textContent=r.prepared_horizon_diagnostic?"T1010 D："+r.prepared_horizon_diagnostic.phase+"；诊断时限1056（原800），teacher="+r.prepared_horizon_diagnostic.teacher_controls+" / student="+r.prepared_horizon_diagnostic.student_controls+" / 实际总控制="+r.prepared_horizon_diagnostic.controls+" / diagnostic success="+r.prepared_horizon_diagnostic.diagnostic_success+" / 成功在原800以内="+r.prepared_horizon_diagnostic.success_at_or_below_original800+"。非benchmark，不替换旧A失败/B成功；W不运行，拟合/ASBS/provider0。":"尚无延长时限诊断D回执。";
    list("robodojo-hypotheses",r.hypotheses,item=>node("li",item));
  }
  function renderResearch(research){
    if(!research)return;
    if(research.schema_version!==1||!research.offline||!research.closed_loop)throw new Error("research schema mismatch");
    const off=research.offline,c=research.closed_loop,d=research.design;
    renderStandard(research.standard_eval);
    renderRoboDojo(research.robodojo);
    $("research-observed").textContent="闭环回执 "+time(c.observed_utc)+" · 离线结果 "+time(off.observed_utc)+"；快照生成时间不替代实验观测时间。";
    const state=$("closed-loop-status");state.replaceChildren(pill(c.status),node("strong"," "+count(c.completed_episodes)+" / "+c.expected_episodes+" 回合"),node("p",c.summary));
    $("closed-loop-conclusion").textContent=c.conclusion?.text||"";
    $("closed-loop-boundary").textContent=c.boundary;
    list("closed-loop-rows",c.per_arm,row=>{const tr=node("tr");tr.append(node("th",row.label),node("td",count(row.completed)+" / 8"),node("td",row.successes===null?"未报告":count(row.successes)+" / "+count(row.completed)),node("td",metric(row.mean_command_energy)),node("td",row.mean_episode_steps===null?"未报告":row.mean_episode_steps.toFixed(1)));tr.firstChild.scope="row";return tr;});
    $("paired-results").replaceChildren(...(c.paired_summary.length?c.paired_summary.map(row=>node("p",row.label+" − 原生："+row.pairs+" 对初态，成功率差 "+percent(row.success_delta)+"；命令能量差 "+metric(row.mean_command_energy_delta)+"。")):[node("p","尚无完整配对对比；缺失结果不填零。") ]));
    $("offline-scope").textContent=off.task_count+" 个任务 · "+off.train_states+" 个训练状态 + "+off.validation_states+" 个开发验证状态 · "+off.head_trainable_parameters.toLocaleString("en-US")+" 个原动作头参数。";
    list("offline-summary",[["ASBS 适配器 vs 原生",off.relative_changes.sampler_vs_native],["ASBS 动作头 vs 原模型",off.relative_changes.head_vs_original],["ASBS 动作头 vs 原生目标微调",off.relative_changes.head_vs_native_fit]],item=>{const el=node("article",undefined,"card");el.append(node("h3",item[0]),node("strong",percent(item[1]),item[1]>0?"negative-result":""),node("p","v6 的任务宏平均命令能量相对变化"));return el;});
    const rows=[];for(const rev of off.revisions){for(const row of [...rev.per_task,{task:"宏平均",sampler:rev.sampler,heads:rev.heads}]){const tr=node("tr");tr.append(node("th",rev.version+" / "+row.task));tr.firstChild.scope="row";for(const value of [row.sampler.native,row.sampler.asbs,row.sampler.gaussian,row.sampler.rwr,row.heads.head_original_energy,row.heads.head_native_fit_energy,row.heads.head_asbs_fit_energy])tr.append(node("td",metric(value)));rows.push(tr);}}
    $("offline-rows").replaceChildren(...rows);list("research-boundaries",off.boundaries,item=>node("li",item));
    $("design-implemented").textContent=d.implemented+" "+(research.preservation?.summary||research.standard_eval?.preservation_design||"");$("design-teacher").textContent=d.teacher;
    list("design-flow",d.steps,item=>{const el=node("li",undefined,"flow-item");el.append(pill(item.status),node("h3",item.title),node("p",item.detail));return el;});
    list("module-rows",[...c.modules,...(research.standard_eval?.evaluation_modules||[]),...(research.preservation?.modules||[]),...(research.robodojo?.modules||[])],item=>{const tr=node("tr"),path=node("th"),state=node("td");path.scope="row";path.append(node("code",item.path));state.append(pill(item.status));tr.append(path,node("td",item.purpose),state);return tr;});
    $("module-tests").textContent=c.mechanism_tests===null?"本轮模块测试回执尚未报告。":"本轮模块机制检查："+c.mechanism_tests+" 项通过；不等于任务收益或安全能力通过。";
    if(research.standard_eval?.evaluation_tests)$("module-tests").textContent+=" 标准评估组件："+research.standard_eval.evaluation_tests+" 项通过，另有实际运行入口的错误计数/恢复集成检查。";
    if(research.preservation)$("module-tests").textContent+=" 保持性 v2："+research.preservation.cpu_tests+" 项 CPU 合同检查通过。"+research.preservation.boundary;
  }
  function render(data){
    if(!data||data.schema_version!==1||!data.content)throw new Error("snapshot schema mismatch");
    if(data.research&&(data.research.schema_version!==1||!data.research.offline||!data.research.closed_loop))throw new Error("research schema mismatch");
    if(data.research?.standard_eval&&data.research.standard_eval.schema!=="t987.standard-eval-public.v1")throw new Error("standard evaluation schema mismatch");
    if(data.research?.preservation&&data.research.preservation.schema!=="t990.implementation.v1")throw new Error("preservation schema mismatch");
    if(data.research?.robodojo&&data.research.robodojo.schema!=="t993.robodojo.v1")throw new Error("RoboDojo schema mismatch");
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
  function newerSnapshot(data){
    if(!latest)return true;
    if(latest.research?.standard_eval&&!data?.research?.standard_eval)return false;
    if(latest.research?.preservation&&!data?.research?.preservation)return false;
    if(latest.research?.robodojo&&!data?.research?.robodojo)return false;
    const oldGenerated=Date.parse(latest.generated_utc),newGenerated=Date.parse(data?.generated_utc);
    if(Number.isFinite(oldGenerated)&&(!Number.isFinite(newGenerated)||newGenerated<oldGenerated))return false;
    for(const key of ["closed_loop","standard_eval","preservation","robodojo"]){
      const oldObserved=Date.parse(latest.research?.[key]?.observed_utc),newObserved=Date.parse(data?.research?.[key]?.observed_utc);
      if(Number.isFinite(oldObserved)&&(!Number.isFinite(newObserved)||newObserved<oldObserved))return false;
    }
    return true;
  }
  async function fetchSnapshot(endpoint,api=false){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(endpoint+(endpoint.includes("?")?"&":"?")+"v="+Date.now(),{cache:"no-store",signal:controller.signal,...(api?{headers:{Accept:"application/vnd.github.raw+json"}}:{})});
      if(!response.ok){
        if(api&&(response.status===403||response.status===429)){
          const reset=Number(response.headers.get("X-RateLimit-Reset"))*1000,retry=Number(response.headers.get("Retry-After"))*1000;
          apiRetryAt=Math.max(Date.now()+refreshInterval,Number.isFinite(reset)?reset:0,Number.isFinite(retry)?Date.now()+retry:0);
        }
        throw new Error("snapshot unavailable");
      }
      const data=await response.json();
      if(!newerSnapshot(data))throw new Error("snapshot observation regressed");
      render(data);return true;
    }finally{clearTimeout(timeout);}
  }
  async function refresh(){
    if(refreshing)return;
    if(Date.now()<nextAttempt){$("refresh-note").textContent="每 90 秒更新；避免重复消耗公开接口额度。下一次可查询约在 "+Math.ceil((nextAttempt-Date.now())/1000)+" 秒后。";return;}
    refreshing=true;nextAttempt=Date.now()+refreshInterval-1000;
    const api=document.querySelector('meta[name="snapshot-api-source"]')?.content;
    const fallback=document.querySelector('meta[name="snapshot-source"]')?.content||"status.json";
    try{
      if(api&&Date.now()>=apiRetryAt){
        try{await fetchSnapshot(api,true);sourceDegraded=false;fetchFailed=false;$("refresh-note").textContent="通过公开数据接口更新 · 每 90 秒查询 · 不使用账户凭据。";return;}
        catch(_){sourceDegraded=true;}
      }else if(api){sourceDegraded=true;}
      await fetchSnapshot(fallback);fetchFailed=false;
      $("refresh-note").textContent=api?"备用快照可能受 CDN 缓存影响；已保留回执时间，较旧数据不会覆盖较新结果。":"每 90 秒读取快照。";
    }catch(_){
      if(!latest&&window.ASBS_SNAPSHOT)render(window.ASBS_SNAPSHOT);
      fetchFailed=location.protocol!=="file:";
      $("refresh-note").textContent="更新暂不可达，或返回数据早于已显示的回执；已保留最后已知结果。";
    }finally{refreshing=false;freshness();}
  }
  $("refresh").addEventListener("click",refresh);
  if(window.ASBS_SNAPSHOT)render(window.ASBS_SNAPSHOT);
  refresh();setInterval(refresh,refreshInterval);setInterval(()=>freshness(),30000);
})();
