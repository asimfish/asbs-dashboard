"use strict";
(() => {
  const data=window.ASBS_HISTORY;
  const $=id=>document.getElementById(id);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const states={candidate:"原稿 / 候选",rejected:"弃用稿","ppt-preview":"历史 PPT 预览","render-comparison":"源图—渲染诊断","editable-preview":"本次 PPT 实际预览"};
  const kinds={teaser:"主图",method:"方法图",comparison:"ASBS 对照",framework:"框架"};
  const validImage=s=>/^figures\/history\/(?:f\d{3}|v2[01]-editable-(?:teaser|method|comparison))\.png$/.test(s);
  const validDeck=s=>/^downloads\/(?:v20-editable|v21-aligned|history-\d{2})\.pptx$/.test(s);
  const images=data.figures.filter(f=>validImage(f.src));
  const byId=new Map(images.map(f=>[f.id,f]));
  const pair={left:'v20-edit-method',right:'v21-edit-method'};
  const imageLabel=f=>`${f.version} · ${kinds[f.kind]||'框架'} · ${f.label}`;
  function zoom(f){$("zoom-title").textContent=imageLabel(f);$("zoom-image").src=f.src;$("zoom-image").alt=f.label;$("zoom-original").href=f.src;$("archive-lightbox").showModal();}
  for(const side of ['left','right']){
    const select=$('compare-'+side);
    for(const f of images.slice().sort((a,b)=>(parseInt(b.version.slice(1))||0)-(parseInt(a.version.slice(1))||0))){
      const option=make('option',imageLabel(f));option.value=f.id;select.append(option);
    }
    select.addEventListener('change',()=>{if(byId.has(select.value)){pair[side]=select.value;renderPair();}});
  }
  function readPair(){
    const parts=location.hash.length<512?location.hash.slice(1).split('/'):[];
    pair.left=parts[0]==='compare'&&byId.has(parts[1])?parts[1]:'v20-edit-method';
    pair.right=parts[0]==='compare'&&byId.has(parts[2])?parts[2]:'v21-edit-method';
  }
  function renderPair(){
    $('history-compare-panels').replaceChildren();
    for(const side of ['left','right']){
      const f=byId.get(pair[side]);$('compare-'+side).value=f.id;
      const card=make('article',undefined,'history-compare-panel'),head=make('header'),button=make('button',undefined,'preview'),img=make('img'),foot=make('footer');
      head.append(make('span',side==='left'?'LEFT / 左侧':'RIGHT / 右侧','tag'),make('h3',imageLabel(f)));
      button.type='button';button.setAttribute('aria-label','放大对比图 '+imageLabel(f));img.src=f.src;img.alt=imageLabel(f);
      img.addEventListener('error',()=>button.replaceWith(make('div','原图暂时无法加载，请更换版本或刷新。','empty-state')),{once:true});
      button.append(img);button.addEventListener('click',()=>zoom(f));
      const original=make('a','打开原图 ↗');original.href=f.src;original.target='_blank';original.rel='noopener';
      foot.append(original,make('span',states[f.state]||'历史稿','muted'));card.append(head,button,foot);$('history-compare-panels').append(card);
    }
    $('pair-status').textContent=`${byId.get(pair.left).version} ↔ ${byId.get(pair.right).version}`;
    $('copy-compare').textContent='复制对比链接';
    history.replaceState(null,'',`#compare/${pair.left}/${pair.right}`);
  }
  $('swap-compare').addEventListener('click',()=>{[pair.left,pair.right]=[pair.right,pair.left];renderPair();});
  $('copy-compare').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-compare').textContent='链接已复制';}catch{$('pair-status').textContent='请复制地址栏：当前对比已写入链接。';}});
  document.querySelectorAll('a[href="#history-compare"],a[href="#decks"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'auto'});}));
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#compare/')){readPair();renderPair();}});
  const versions=[...new Set(data.figures.map(f=>f.version))].sort((a,b)=>(parseInt(b.slice(1))||0)-(parseInt(a.slice(1))||0));
  for(const v of versions){const o=make("option",v==="early"?"早期 / 未编号":v);o.value=v;$("version").append(o);}
  function render(){
    const filtered=data.figures.filter(f=>["version","kind","state"].every(k=>$(k).value==="all"||$(k).value===f[k])).slice().sort((a,b)=>(parseInt(b.version.slice(1))||0)-(parseInt(a.version.slice(1))||0));
    $("archive-grid").replaceChildren();$("count").textContent=`${filtered.length} / ${data.figures.length} 个整图 / 预览`;
    if(!filtered.length)$("archive-grid").append(make("p","此筛选条件下没有图稿。","empty-filter"));
    for(const f of filtered){
      if(!validImage(f.src))continue;
      const card=make("article",undefined,"archive-card"),head=make("header"),button=make("button",undefined,"preview"),img=make("img"),foot=make("footer");
      head.append(make("span",`${f.version} · ${kinds[f.kind]||"框架"} · ${states[f.state]}`,"tag"),make("h3",f.label));
      button.type="button";button.setAttribute("aria-label","放大 "+f.label);img.src=f.src;img.alt=f.label;img.loading="lazy";button.append(img);
      button.addEventListener("click",()=>zoom(f));
      const original=make("a","原图 ↗"),download=make("a","下载 PNG ↓");original.href=download.href=f.src;original.target="_blank";original.rel="noopener";download.download=f.id+".png";
      foot.append(original,download);
      for(const side of ['left','right']){const compare=make('button',side==='left'?'放左侧':'放右侧');compare.type='button';compare.dataset.compareSide=side;compare.addEventListener('click',()=>{pair[side]=f.id;renderPair();$('history-compare').scrollIntoView({behavior:'auto'});});foot.append(compare);}
      foot.append(make("span","SHA256 "+f.sha256.slice(0,12),"hash"));card.append(head,button,foot);$("archive-grid").append(card);
    }
  }
  for(const k of ["version","kind","state"])$(k).addEventListener("change",render);
  $("zoom-close").addEventListener("click",()=>$("archive-lightbox").close());
  $("deck-count").textContent=`${data.decks.length} 个去重文件（含 v20 重建与 v21 对齐稿）`;
  for(const d of data.decks){
    if(!validDeck(d.src))continue;
    const item=make("article",undefined,"deck-item"),body=make("div"),a=make("a","下载 PPTX ↓");
    body.append(make("h3",d.label),make("p",`${d.counts.slides} 页 · ${d.counts.text} 个含文字对象 · ${d.counts.images} 个图片对象${d.latest?" · 本次实际渲染通过":" · 历史文件，未按当前科学方案重审"}`));
    a.href=d.src;a.download="";item.append(body,a);$("deck-list").append(item);
  }
  readPair();renderPair();render();
})();
