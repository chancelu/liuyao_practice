// 双区知识层共享类型：每一步研习都拆为「经典区」与「实战区」
// 经典区：典籍引文 + 逐句白话解读（解决「只引用不解读」）
// 实战区：典籍未覆盖的概念、派别分歧、命理师日常速查经验（注明派别，与经典区隔开）

export interface ClassicItem {
  source: string;  // 出处（书名/卷课）
  quote: string;   // 典籍原文或口诀
  explain: string; // 逐句白话解读（怎么理解、怎么用）
}

export interface PracticeItem {
  title: string;   // 实战条目名
  school: string;  // 派别标签：格局派 / 旺衰派 / 调候派 / 盲派 / 新派 / 实务共识 等
  text: string;    // 内容
}

export interface StepKnowledge {
  classics: ClassicItem[];
  practice: PracticeItem[];
}
