"use strict";
(() => {
  const data=window.ASBS_HISTORY;
  const $=id=>document.getElementById(id);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const states={candidate:"原稿 / 候选",rejected:"弃用稿","ppt-preview":"历史 PPT 预览","render-comparison":"源图—渲染诊断","editable-preview":"本次 PPT 实际预览"};
  const kinds={teaser:"主图",method:"方法图",comparison:"ASBS 对照",framework:"框架"};
  const validImage=s=>/^figures\/history\/(?:f\d{3}|v2[01]-editable-(?:teaser|method|comparison))\.png$/.test(s);
  const validDeck=s=>/^downloads\/(?:v20-editable|v21-aligned|history-\d{2})\.pptx$/.test(s);
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
      button.addEventListener("click",()=>{$("zoom-title").textContent=f.version+" · "+f.label;$("zoom-image").src=f.src;$("zoom-image").alt=f.label;$("zoom-original").href=f.src;$("archive-lightbox").showModal();});
      const original=make("a","原图 ↗"),download=make("a","下载 PNG ↓");original.href=download.href=f.src;original.target="_blank";original.rel="noopener";download.download=f.id+".png";
      foot.append(original,download,make("span","SHA256 "+f.sha256.slice(0,12),"hash"));card.append(head,button,foot);$("archive-grid").append(card);
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
  render();
})();
