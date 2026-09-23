(() => {
  "use strict";
  const data = window.ASBS_FIGURES;
  const $ = id => document.getElementById(id);
  if (!data || !Array.isArray(data.versions)) { $("selection-status").textContent = "版本数据未加载，请刷新页面。"; return; }
  const byVersion = new Map(data.versions.map(v => [v.id, v]));
  const kinds = Object.keys(data.figures);
  const state = {version:data.latest, figure:"teaser", compare:"v19", comparing:false};
  const element = (tag, text, cls) => { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(cls)node.className=cls; return node; };
  function source(version,kind) {
    const v=byVersion.get(version), f=data.figures[kind];
    if(!v || !f || !v.available.includes(kind))return null;
    const path=`figures/${version}/${f.file}`;
    return /^figures\/v(?:17|18|19|20)\/(?:teaser|method|asbs_diffusion_flow)\.png$/.test(path) ? path : null;
  }
  function readHash(){
    const parts=location.hash.slice(1).split("/");
    state.version=byVersion.has(parts[0]) ? parts[0] : data.latest;
    state.figure=kinds.includes(parts[1]) ? parts[1] : "teaser";
    state.comparing=byVersion.has(parts[2]);
    state.compare=state.comparing ? parts[2] : "v19";
  }
  function writeHash(){history.replaceState(null,"",`#${state.version}/${state.figure}${state.comparing?`/${state.compare}`:""}`);}
  function openImage(path,label){
    $("lightbox-title").textContent=label;
    $("lightbox-image").alt=label;
    $("lightbox-image").src=path;
    $("lightbox-original").href=path;
    $("lightbox").showModal();
    $("close-lightbox").focus();
  }
  function panel(version){
    const v=byVersion.get(version), f=data.figures[state.figure], path=source(version,state.figure);
    const card=element("article",undefined,"figure-panel"), header=element("div",undefined,"figure-header"), title=element("div");
    title.append(element("h3",`${v.id} / ${f.label}`),element("p",`${v.date} · ${v.tag}`));header.append(title);
    if(path){
      const actions=element("div",undefined,"figure-actions");
      const original=element("a","打开原图 ↗");original.href=path;original.target="_blank";original.rel="noopener";
      const download=element("a","下载 PNG");download.href=path;download.download=`asbs-${v.id}-${state.figure}.png`;
      actions.append(original,download);header.append(actions);
    }
    card.append(header);
    if(path){
      const button=element("button",undefined,"image-button");button.type="button";button.setAttribute("aria-label",`放大 ${v.id} ${f.label}`);
      const img=element("img");img.src=path;img.alt=`${v.id} ${f.label}：${v.notes[state.figure]}`;img.decoding="async";
      img.addEventListener("error",()=>{const notice=element("div","原图暂时无法加载。请刷新，或尝试其他版本。","empty-state");button.replaceWith(notice);},{once:true});
      button.append(img);button.addEventListener("click",()=>openImage(path,`${v.id} / ${f.label}`));card.append(button);
    }else{
      const empty=element("div",undefined,"empty-state");empty.append(element("strong","此版本尚无这张图"),element("span",`${v.id} 仅归档了主图与方法图；ASBS 对照图从 v19 开始。`));card.append(empty);
    }
    const note=element("div",undefined,"figure-note"), scope=element("p");
    scope.append(element("span",v.scope==="online"?"历史在线方案":"当前离线方案",`tag${v.scope==="online"?" old":""}`),document.createTextNode(v.notes[state.figure]||v.limit));
    note.append(scope,element("p",v.limit));card.append(note);return card;
  }
  function render(){
    $("version-select").value=state.version;$("compare-select").value=state.compare;
    $("compare-toggle").setAttribute("aria-pressed",String(state.comparing));
    document.querySelectorAll("[data-figure]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.figure===state.figure)));
    $("figures").classList.toggle("comparing",state.comparing);$("figures").replaceChildren(panel(state.version));
    if(state.comparing)$("figures").append(panel(state.compare));
    const different=state.comparing && byVersion.get(state.version).scope!==byVersion.get(state.compare).scope;
    $("formulation-warning").hidden=!different;
    $("formulation-warning").textContent=different?"注意：这两个版本属于不同科学方案。v17 是历史在线适配；v18 起为离线续接感知巩固。差异不只是视觉样式。":"";
    $("selection-status").textContent=`${state.version}${state.comparing?` ↔ ${state.compare}`:""} · ${data.figures[state.figure].label}`;
    $("copy-link").textContent="复制此视图链接";writeHash();
  }
  data.versions.forEach(v=>{
    for(const id of ["version-select","compare-select"]){const option=element("option",v.id);option.value=v.id;$(id).append(option);}
    const row=element("article",undefined,"history-item"), info=element("div");
    row.append(element("div",v.id,"history-version"));info.append(element("h3",v.title),element("p",v.changes),element("p",v.limit));row.append(info);
    const show=element("button","查看此版 →");show.type="button";show.addEventListener("click",()=>{state.version=v.id;state.comparing=false;render();$("workspace").scrollIntoView({behavior:"auto"});$("version-select").focus();});row.append(show);$("history-list").append(row);
  });
  $("version-select").addEventListener("change",e=>{state.version=e.target.value;render();});
  $("compare-select").addEventListener("change",e=>{state.compare=e.target.value;state.comparing=true;render();});
  $("compare-toggle").addEventListener("click",()=>{state.comparing=!state.comparing;render();});
  document.querySelectorAll("[data-figure]").forEach(button=>button.addEventListener("click",()=>{state.figure=button.dataset.figure;render();}));
  $("copy-link").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);$("copy-link").textContent="链接已复制";}catch{ $("selection-status").textContent="浏览器未允许复制；可直接复制地址栏，此视图已写入链接。";}});
  $("close-lightbox").addEventListener("click",()=>$("lightbox").close());
  $("lightbox").addEventListener("click",e=>{if(e.target===$("lightbox")){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  document.querySelectorAll('a[href="#history"], a[href="#workspace"]').forEach(link=>link.addEventListener("click",event=>{
    event.preventDefault();document.querySelector(link.getAttribute("href")).scrollIntoView({behavior:"auto"});
  }));
  window.addEventListener("hashchange",()=>{if(location.hash==="#history"||location.hash==="#workspace")return;readHash();render();});
  $("latest-label").textContent=data.latest;readHash();render();
})();
