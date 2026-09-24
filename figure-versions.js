/* Curated public content only. No internal paths, logs or credentials. */
window.ASBS_FIGURES = {
  latest: "v21",
  figures: {
    teaser: {label:"图 1 · 主图", file:"teaser.png", description:"从学生候选的后果评价，到冻结 VLA 可重复调用的噪声提议。"},
    method: {label:"图 2 · 方法图", file:"method.png", description:"分离评分采集、离线提议学习和闭环执行；历史接口差异另作标注。"},
    comparison: {label:"图 3 · ASBS / Diffusion / Flow", file:"asbs_diffusion_flow.png", description:"比较标准样本监督与能量目标监督，不作普遍性能排名。"}
  },
  versions: [
    {id:"v21", title:"实验接口对齐 · 可编辑逻辑稿", scope:"point-source", tag:"当前实验对齐稿", date:"2026-09-24", available:["teaser","method","comparison"], sources:{teaser:"figures/history/v21-editable-teaser.png",method:"figures/history/v21-editable-method.png",comparison:"figures/history/v21-editable-comparison.png"}, changes:"模拟器评价学生自己的候选；按实际点源 adjoint matching 重画学习与部署接口，删除未实现分支。三张图均可下载编辑。", limit:"实际 PPT 渲染，不是最终美术稿。评分器仍需验证，未证明机器人增益；不把点源特例画成一般源 ASBS。", notes:{teaser:"将昂贵的候选后果评价摊销成可复用噪声提议；无动作教师，机械臂仍为概念插图。",method:"Z(0)=0；原生高斯先验是无控制过程的终点。H、M 按登记版本读取，不把新评分器写成已验证结果。",comparison:"比较适配阶段的监督接口，保留同数据、同部署频率及单次解码的重排基线。"}},
    {id:"v20", title:"层次与场景质感修订", scope:"offline", tag:"历史视觉候选", date:"2026-09-23", available:["teaser","method","comparison"], changes:"参考 HarnessVLA 的具体表征与主次层次；图 3 保留已认可的上半部结构，压缩下方应用区。", limit:"此处保留 PNG 原图；另有可编辑重建。旧源分布、corrector 和蒸馏表述不等同于当前实现，参见 v21。", notes:{teaser:"改用腕部与夹爪近景；证据进入续接价值估计，部署环重新观测。场景为示意，不是实验照片。",method:"以离线 ASBS 为视觉核心，部署环保留独立的 history 输入与冻结 VLA。",comparison:"保留 v19 上半部的三栏机制对照；修改下方应用说明，保留公平比较边界。"}},
    {id:"v19", title:"技术线稿与机制对照", scope:"offline", tag:"图 3 上半部已认可", date:"2026-09-23", available:["teaser","method","comparison"], changes:"新增 ASBS 与标准 diffusion / flow matching 对照；修正证据箭头、history 符号与执行前缀颜色。", limit:"整体视觉质感尚未获认可；图 3 上半部作为后续保留方向。", notes:{teaser:"一个机械臂示意，减少重复插图；证据进入续接价值估计，不进入源噪声。",method:"无装饰性机械臂；显式区分理想目标 q* 与学习到的 proposer。",comparison:"上半部为作者认可方向。ASBS 是 diffusion sampler；能量型 flow 替代方法也存在。"}},
    {id:"v18", title:"对齐离线 S2→S1 方案", scope:"offline", tag:"历史视觉候选", date:"2026-09-23", available:["teaser","method"], changes:"将图稿从历史在线适配版本迁移到续接感知的离线巩固架构。", limit:"机械臂偏合成质感，模块层次和文字密度仍需改善。", notes:{teaser:"采集经验证的转移，再离线学习 proposer，后续执行无需在线教师或 critic。",method:"区分 critic 的目标构造、ASBS 训练和运行时部署。"}},
    {id:"v17", title:"历史在线适配方案", scope:"online", tag:"不同科学方案", date:"归档版本", available:["teaser","method"], changes:"保留早期在线反馈与短前缀闭环适配图，用于追溯研究方向变化。", limit:"不是当前离线巩固方案的等价画法。跨版本对照时请同时比较方法含义。", notes:{teaser:"历史在线反馈叙事，仅供追溯，不作为当前论文主图。",method:"历史在线算法；不要将其运行时调用方式移入当前离线架构。"}}
  ]
};
