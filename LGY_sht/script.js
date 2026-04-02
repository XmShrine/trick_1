const dossiers = [
  {
    title: "主观困难卷",
    note: "把一切现实不便切成主观与客观两部分，是他的底层操作。",
    items: [
      ["课表是客观决定的", "北航调课争论"],
      ["想不想来是主观问题", "北航调课争论"],
      ["主观上的困难都可以克服", "北航调课争论"],
      ["你这不是不能，是不想", "风格归纳"]
    ]
  },
  {
    title: "扰乱军心卷",
    note: "别人提出异议时，他常常先重写对方动机，再上升到集体与国家。",
    items: [
      ["希望不愿意返校的同学不要在这扰乱军心", "烟台二中复学微博"],
      ["可见内心极度懒惰，完全不顾自己与国家的未来", "烟台二中复学微博"],
      ["必须从集体出发", "北航调课争论"]
    ]
  },
  {
    title: "治理漏洞卷",
    note: "看到漏洞，他的第一反应不是笑，而是报修、投诉、补洞、加钢板。",
    items: [
      ["总有人钻此漏洞", "TD 线圈事件"],
      ["我再去投诉一下", "TD 线圈事件"],
      ["多补几次自然就没人去破坏了", "TD 线圈事件"],
      ["或者干脆加一块钢板", "TD 线圈事件"]
    ]
  },
  {
    title: "文化整顿卷",
    note: "从洞口到社团再到风气，他总能把具体事件纳入治理框架。",
    items: [
      ["这是文化大事！", "TD 线圈事件聊天"],
      ["完全支持学校的措施", "北航 ACG 整顿立场"],
      ["当一时不能将负面影响控制在一个可控范围内，当然应当暂停之", "北航 ACG 整顿立场"]
    ]
  },
  {
    title: "依法告知卷",
    note: "普通人吵架，他喜欢写成正式文书并保留一切合法权利。",
    items: [
      ["现正式告知如下", "侵权告知书"],
      ["将立即向公安机关报案，依法追究其行政法律责任", "侵权告知书"],
      ["并保留通过民事诉讼主张赔偿损失、赔礼道歉等一切合法权利", "侵权告知书"]
    ]
  }
];

const quoteWall = [
  "懒惰者无法建设社会主义",
  "群众未必都是对的",
  "怎么还有互感线圈",
  "马上打电话",
  "这是文化大事",
  "不要在这扰乱军心",
  "教务不会因你们的愚蠢之言而改变",
  "应该思考不能上课和不想上课的区别",
  "总有人钻此漏洞",
  "我再去投诉一下",
  "课表是客观决定的",
  "想不想来是主观问题"
];

const resultProfiles = {
  governance: {
    title: "治理预备队",
    summary: "你对漏洞、流程、风气和秩序高度敏感。看到问题，你更想立刻处理，而不是先解释为什么可以算了。",
    judgment: "李广昱评语：你已经初步具备补洞、报修、打电话与追加措施的治理意识。"
  },
  discipline: {
    title: "纪律执行组",
    summary: "你会自然地把很多分歧归入主观态度与集体纪律问题，倾向于先要求立场摆正，再讨论具体困难。",
    judgment: "李广昱评语：客观约束可以谈，主观松动不能被包装成原则。"
  },
  legalism: {
    title: "程序文书流",
    summary: "你对程序、证据、通知、留痕和正式措辞有强烈偏好。普通矛盾到了你这里，往往会升级成带格式的处理意见。",
    judgment: "李广昱评语：建议完善附件、送达方式与后续处置条款。"
  },
  agitation: {
    title: "情绪扩散节点",
    summary: "你在集体事件里更容易扩大疑虑、放大观感、制造额外情绪波动，而不是先维持秩序和推进安排。",
    judgment: "李广昱评语：这种表达继续扩散，只会影响整体安排。"
  },
  loophole: {
    title: "边界试探者",
    summary: "你面对规则和设施边界时，总会先想到还能不能再钻一下、卡一下、蹭一下，属于典型的机会主义反应。",
    judgment: "李广昱评语：洞越补越厚，通常就是因为你这种思路从不缺席。"
  },
  comfort: {
    title: "舒适优先派",
    summary: "你会把舒服、方便、少折腾放在前面，也愿意把这种优先顺序理解成天然合理的常识。",
    judgment: "李广昱评语：安逸不是原则，舒服也不能自动生成正当性。"
  },
  mediation: {
    title: "温和协调派",
    summary: "你不喜欢先定性，更愿意缓冲冲突、解释处境、在个体感受和整体安排之间找中间地带。",
    judgment: "李广昱评语：协调当然有价值，但不能把一切都协调到没有立场。"
  }
};

const quizBundles = [
  {
    id: "governance",
    title: "治理实践卷",
    note: "偏向补洞、投诉、通知、加固和现场处置的判断题。",
    questions: [
      {
        prompt: "你发现门禁旁边有个明显能绕开的缺口，第一反应更像：",
        options: [
          { text: "先拍照、报修，并想办法让它尽快失效", scores: { governance: 2, discipline: 1 } },
          { text: "先看看能不能顺手通过一次", scores: { loophole: 2, comfort: 1 } },
          { text: "先提醒周围人别急着传播，看看怎么平稳处理", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "报修之后，第二天漏洞还在，你更可能：",
        options: [
          { text: "继续打电话催，必要时追加物理加固建议", scores: { governance: 2, legalism: 1 } },
          { text: "那就说明默认能用，先享受便利", scores: { loophole: 2 } },
          { text: "发个提醒帖，但不想再往下折腾", scores: { comfort: 2, mediation: 1 } }
        ]
      },
      {
        prompt: "有人说“一个小洞而已，何必上纲上线”，你更认同：",
        options: [
          { text: "小洞不是重点，扩散成风气问题才是重点", scores: { governance: 2, discipline: 1 } },
          { text: "能钻说明系统自己也有问题，用户不必太自责", scores: { loophole: 2 } },
          { text: "先别争对错，把情绪压下来最重要", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你看到一堆人围着设施研究怎么绕过它，最像你的动作是：",
        options: [
          { text: "直接打断并提醒这是监控区域", scores: { discipline: 2, governance: 1 } },
          { text: "站旁边看看他们到底能玩出什么花样", scores: { loophole: 2, agitation: 1 } },
          { text: "先观察有没有现实需求导致他们这么做", scores: { mediation: 2, comfort: 1 } }
        ]
      },
      {
        prompt: "如果设施被破坏了，你更倾向于把责任理解为：",
        options: [
          { text: "个别人长期把边界试探当乐子，最终酿成结果", scores: { governance: 2, discipline: 1 } },
          { text: "设施设计不合理，激起了大家的逆反心理", scores: { loophole: 1, agitation: 2 } },
          { text: "双方都有问题，先修好再说", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你会不会在现场写个正式通知贴上去？",
        options: [
          { text: "会，最好有编号、有措辞、有后果提示", scores: { legalism: 2, governance: 1 } },
          { text: "不会，通知没有实际意义", scores: { loophole: 1, comfort: 2 } },
          { text: "会，但措辞尽量温和，不刺激围观者", scores: { mediation: 2, legalism: 1 } }
        ]
      },
      {
        prompt: "有人劝你“别管这么细”，你更可能回答：",
        options: [
          { text: "这不是细，是最基本的治理问题", scores: { governance: 2 } },
          { text: "行吧，反正大家也都这样", scores: { comfort: 2 } },
          { text: "可以先管到不出事的程度，不必一步到位", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果你有机会设计整改方案，你最偏好：",
        options: [
          { text: "补洞、加固、贴通知、加强追责，形成闭环", scores: { governance: 2, legalism: 1 } },
          { text: "留个小口子，满足确有需要的人", scores: { loophole: 2, comfort: 1 } },
          { text: "先调研使用场景，再做更柔和的改造", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "看到别人在网上夸“这办法真聪明”，你更像：",
        options: [
          { text: "觉得这类传播本身就在制造更大问题", scores: { governance: 2, agitation: 1 } },
          { text: "觉得确实挺机智，边界就是拿来测试的", scores: { loophole: 2 } },
          { text: "觉得不必高调传播，也不必道德化", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果维修部门一直没动作，你最可能：",
        options: [
          { text: "持续催办，记录时间点和沟通内容", scores: { legalism: 2, governance: 1 } },
          { text: "那就继续凑合用，别难为自己", scores: { comfort: 2, loophole: 1 } },
          { text: "找熟人沟通，看有没有更平和的渠道", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "当有人说“大家都在钻，不差我一个”，你会：",
        options: [
          { text: "正因为会扩散，所以更要尽快处理", scores: { governance: 2, discipline: 1 } },
          { text: "这说明系统约束本来就不强", scores: { loophole: 2 } },
          { text: "先减少对抗语气，不然他们更不会听", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你更赞成哪句判断？",
        options: [
          { text: "漏洞是客观存在，利用它是主观选择", scores: { discipline: 2, governance: 1 } },
          { text: "客观有漏洞，就默认允许主观利用", scores: { loophole: 2 } },
          { text: "先分清需求场景，再谈谁对谁错", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果有人在群里起哄“快来刷，趁还没修”，你更接近：",
        options: [
          { text: "点名反对，并把这种传播归入风气问题", scores: { governance: 2, agitation: 1 } },
          { text: "收藏一下，免得以后用不到", scores: { loophole: 2 } },
          { text: "提醒别公开扩散，但不进一步上升", scores: { mediation: 2, comfort: 1 } }
        ]
      },
      {
        prompt: "你更能接受哪种结尾？",
        options: [
          { text: "设施恢复、流程闭环、现场秩序稳定", scores: { governance: 2 } },
          { text: "虽没修好，但大家也找到通融办法", scores: { comfort: 2, loophole: 1 } },
          { text: "各方都留一点面子，不至于闹僵", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "面对一次明显可治理却迟迟无人治理的小问题，你最可能：",
        options: [
          { text: "主动接管，哪怕被人嫌麻烦", scores: { governance: 2, discipline: 1 } },
          { text: "顺势利用，毕竟规则空着也是空着", scores: { loophole: 2 } },
          { text: "先看别人会不会动，我不想当第一个出头的", scores: { comfort: 2, mediation: 1 } }
        ]
      }
    ]
  },
  {
    id: "collective",
    title: "集体立场卷",
    note: "偏向主观困难、群众意见、部署正当性与组织纪律的判断题。",
    questions: [
      {
        prompt: "群里商量调课，有人说“我就是周末不想上”，你最接近：",
        options: [
          { text: "这已经说明问题在主观态度上", scores: { discipline: 2 } },
          { text: "不想上也正常，休息本来就重要", scores: { comfort: 2 } },
          { text: "先问清是不是还有别的客观原因", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果大多数人都反对你的安排，你更相信：",
        options: [
          { text: "多数意见需要听，但不自动等于正确", scores: { discipline: 2 } },
          { text: "多数既然都不愿意，那就该改", scores: { comfort: 1, agitation: 1 } },
          { text: "最好重做方案，让每方都有台阶", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你怎么看“不能上”和“不想上”的区别？",
        options: [
          { text: "必须严格区分，不然讨论会失真", scores: { discipline: 2 } },
          { text: "很多时候差不多，别过度苛责", scores: { comfort: 2 } },
          { text: "先区分，再给出缓冲安排", scores: { mediation: 2, discipline: 1 } }
        ]
      },
      {
        prompt: "当既定安排已经下达，还有人不断怀疑其合理性，你更倾向于：",
        options: [
          { text: "认为这会影响整体推进", scores: { discipline: 2, agitation: 1 } },
          { text: "觉得多讨论讨论总没坏处", scores: { agitation: 2 } },
          { text: "让大家先执行，再开窗口反馈", scores: { mediation: 2, governance: 1 } }
        ]
      },
      {
        prompt: "你认同哪句更接近真实组织生活？",
        options: [
          { text: "个体感受要有，但不能凌驾于整体秩序", scores: { discipline: 2 } },
          { text: "大家都舒服，组织才有意义", scores: { comfort: 2 } },
          { text: "秩序和感受都要有回转余地", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "有人把所有不同意见都归为“群众意见”，你更接近：",
        options: [
          { text: "群众不天然正确，不能用人数代替判断", scores: { discipline: 2 } },
          { text: "既然这么多人都这么想，总要顺着来", scores: { comfort: 1, agitation: 1 } },
          { text: "先把群众意见分层，不要一锅煮", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "面对一项你个人不喜欢但已经部署好的安排，你通常：",
        options: [
          { text: "先执行，再在边界内争取调整", scores: { discipline: 2, legalism: 1 } },
          { text: "先表达强烈不满，看有没有可能推翻", scores: { agitation: 2 } },
          { text: "先找人商量能不能更柔和地处理", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果有人不断把个人不便放大成原则问题，你更想说：",
        options: [
          { text: "别把主观舒适感包装成普遍立场", scores: { discipline: 2 } },
          { text: "每个人都有权把自己的感受放在前面", scores: { comfort: 2 } },
          { text: "先承认感受，再讨论原则", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你更相信哪种判断路径？",
        options: [
          { text: "先认清客观约束，再分析主观态度", scores: { discipline: 2, governance: 1 } },
          { text: "先看大家是否愿意，愿意比约束更重要", scores: { comfort: 2 } },
          { text: "两边都看，但尽量别急着定性", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果你负责组织一次临时调整，最怕出现的是：",
        options: [
          { text: "不断有人用情绪搅乱节奏", scores: { discipline: 2, agitation: 1 } },
          { text: "安排太硬，大家都不开心", scores: { comfort: 2 } },
          { text: "缺少一个让少数人表达的渠道", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "别人说“你不能总要求别人克服困难”，你最可能：",
        options: [
          { text: "先区分哪些是客观困难，哪些只是主观退让", scores: { discipline: 2 } },
          { text: "那就少要求一点，别这么累", scores: { comfort: 2 } },
          { text: "可以要求，但也该附带补救措施", scores: { mediation: 2, governance: 1 } }
        ]
      },
      {
        prompt: "你认同哪种组织风格？",
        options: [
          { text: "安排落地优先，讨论要服务于执行", scores: { discipline: 2 } },
          { text: "心情稳定优先，执行可以慢一点", scores: { comfort: 2 } },
          { text: "执行和感受都要兼顾，不能单边压过去", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "当你看到群里开始接龙统计冲突时，你更觉得：",
        options: [
          { text: "这是识别客观问题的必要步骤", scores: { legalism: 1, discipline: 2 } },
          { text: "太麻烦了，不如直接换个大家都舒服的时间", scores: { comfort: 2 } },
          { text: "统计之外，还应允许留言说明处境", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果你的意见在群里挨了很多反驳，你更可能：",
        options: [
          { text: "继续论证，直到把问题定义重新拿回来", scores: { discipline: 2, agitation: 1 } },
          { text: "算了，别吵了，大家开心就行", scores: { comfort: 2 } },
          { text: "退一步，把争议缩小到可协调部分", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你最认可的结尾是：",
        options: [
          { text: "安排执行了，少数冲突也有边界内补救", scores: { discipline: 2, governance: 1 } },
          { text: "没人不开心，哪怕安排松一点", scores: { comfort: 2 } },
          { text: "各方都有表达，也能接受最后结果", scores: { mediation: 2 } }
        ]
      }
    ]
  },
  {
    id: "culture",
    title: "风气整顿卷",
    note: "偏向校园风气、社团边界、公开表达、文书化应对与价值判断的题目。",
    questions: [
      {
        prompt: "你看到一项校园活动的宣传明显让你不舒服，你更像：",
        options: [
          { text: "先判断它会不会扩散成风气问题", scores: { governance: 2, discipline: 1 } },
          { text: "不舒服归不舒服，别人爱怎么搞怎么搞", scores: { comfort: 2 } },
          { text: "先看具体内容，再决定要不要上升", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果你认为某社团内容已经越界，你最想做的是：",
        options: [
          { text: "写一段支持治理的论证，说明暂停之合理", scores: { discipline: 2, governance: 1 } },
          { text: "直接开喷，让大家知道我很不爽", scores: { agitation: 2 } },
          { text: "私下反馈，不想在公开场合过度扩大", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "当别人说“这只是兴趣爱好，别管太多”，你更接近：",
        options: [
          { text: "兴趣爱好也有公共边界，不能脱离风气问题", scores: { governance: 2 } },
          { text: "只要不是违法，没必要讨论边界", scores: { comfort: 2 } },
          { text: "边界可以谈，但别一开始就用重话", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果你想表达支持治理的立场，你最偏好的形式是：",
        options: [
          { text: "一段层次分明、逻辑完整的长文", scores: { discipline: 1, legalism: 2 } },
          { text: "一句情绪很足的短评", scores: { agitation: 2 } },
          { text: "一段尽量照顾双方情绪的说明", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "面对公开争议，你更在乎：",
        options: [
          { text: "学校有没有把负面影响控制在可控范围内", scores: { governance: 2 } },
          { text: "个人能不能继续按自己喜欢的方式玩", scores: { comfort: 2 } },
          { text: "讨论方式是不是没有把人直接打成敌人", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你怎么看“自由表达”和“学校管理”的关系？",
        options: [
          { text: "自由表达存在，但不能取消学校边界", scores: { discipline: 2 } },
          { text: "自由表达优先，学校最好少插手", scores: { comfort: 2 } },
          { text: "边界需要说清，但应避免直接扣大词", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果别人批评你“太像在搞审查”，你更可能：",
        options: [
          { text: "强调这不是不自信，而是最基本的管理能力", scores: { governance: 2, discipline: 1 } },
          { text: "那我就更直白一点，反正你们也不会听", scores: { agitation: 2 } },
          { text: "先把边界讲具体，避免大词吓人", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "若活动已经引发连锁争议，你最能接受的处置是：",
        options: [
          { text: "先暂停，再整顿，再评估", scores: { governance: 2, legalism: 1 } },
          { text: "照常办，争议过几天就散了", scores: { comfort: 2 } },
          { text: "短暂停一下，同时公开解释原因", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "当你想批评一件事时，你更喜欢从哪里下手？",
        options: [
          { text: "从风气、秩序、导向和后果入手", scores: { governance: 2 } },
          { text: "从我看不惯、我不爽入手", scores: { agitation: 2 } },
          { text: "从具体情境和边界模糊处入手", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "如果别人侵害了你的个人边界，比如挪动车辆或持续骚扰，你会：",
        options: [
          { text: "固定证据，写出正式告知并准备后续程序", scores: { legalism: 2 } },
          { text: "先在朋友圈或群里骂一顿", scores: { agitation: 2 } },
          { text: "先私下提醒，对方再来才升级", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你最相信哪种说服方式？",
        options: [
          { text: "把它写成体系化论证，让人无路可退", scores: { discipline: 1, legalism: 2 } },
          { text: "火力足够猛，对方自然会闭嘴", scores: { agitation: 2 } },
          { text: "先降低对抗，再慢慢推动结论", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "对一件你觉得有问题的校园现象，你通常会：",
        options: [
          { text: "先归类到更大的治理框架里理解", scores: { governance: 2 } },
          { text: "只要不直接影响我，就不想多管", scores: { comfort: 2 } },
          { text: "先确认它到底影响了谁、影响多大", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "当你准备发一段公开表态时，你最想让别人感受到：",
        options: [
          { text: "我不是在发泄，我是在讲原则", scores: { discipline: 2 } },
          { text: "我现在非常愤怒，你们最好都看见", scores: { agitation: 2 } },
          { text: "我希望事情能往可收拾的方向走", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "你更偏好哪种结尾方式？",
        options: [
          { text: "形成书面结果，明确边界和后果", scores: { legalism: 2 } },
          { text: "大家吵完就散，不必留下太多痕迹", scores: { comfort: 2 } },
          { text: "留下一个不那么伤人的处理结论", scores: { mediation: 2 } }
        ]
      },
      {
        prompt: "对一名典型的“李广昱式人物”，你最核心的印象是：",
        options: [
          { text: "喜欢把小事纳入秩序、导向和治理的总框架", scores: { governance: 2, discipline: 1 } },
          { text: "情绪很足，说话很冲，很容易把气氛点着", scores: { agitation: 2 } },
          { text: "其实是个不太会留白的人，但也未必全错", scores: { mediation: 2 } }
        ]
      }
    ]
  }
];

const quizState = {
  bundleId: "",
  questionIndex: 0,
  answers: [],
  scores: {}
};

const debateData = {
  调课: [
    "周末上课不方便",
    "少数人时间冲突也应该被照顾",
    "大家都不想周末上课",
    "老师也应该考虑学生休息"
  ],
  复学: [
    "疫情风险还是很大",
    "有人不想返校也可以理解",
    "线上上课更安全",
    "现在返校是不是太急了"
  ],
  漏洞: [
    "只是个洞而已，没必要这么认真",
    "能刷进去说明系统本来就有问题",
    "别人钻一下也没什么",
    "没必要每次都投诉"
  ],
  社团文化: [
    "动漫社整顿是不是太过了",
    "学生穿什么是个人自由",
    "这不就是官僚式管理吗",
    "暂停活动会不会太夸张"
  ],
  集体与个体: [
    "我个人确实不想配合",
    "少数人的利益也很重要",
    "群众都这么想，为什么不听",
    "你不能总要求别人克服困难"
  ]
};

const openingMap = {
  调课: [
    "你这个问题本质上不是不能上，而是不想上。",
    "先别把个人不便包装成原则问题。",
    "你这个假设很大胆。"
  ],
  复学: [
    "你这不是谨慎，而是贪图安逸。",
    "不能把情绪化担忧当成现实判断。",
    "先把动机问题看清楚。"
  ],
  漏洞: [
    "这已经不是洞的问题，而是秩序问题。",
    "你以为是小聪明，实际是在给漏洞扩散创造条件。",
    "这种说法本身就说明你没有把事情看深。 "
  ],
  社团文化: [
    "你这不是自由问题，而是治理边界问题。",
    "不能把一切都用个人表达糊过去。",
    "如果负面影响已经扩散，就不是轻飘飘一句自由能解决的。 "
  ],
  集体与个体: [
    "你这个立场从一开始就没有从集体出发。",
    "个体感受当然存在，但不能凌驾于整体秩序之上。",
    "先把你的立场摆正。"
  ]
};

const objectiveMap = {
  调课: "课表是客观决定的，想不想配合是主观问题。客观冲突可以讨论，主观不愿意不能被抬成普遍原则。",
  复学: "全市部署和学校安排属于客观现实，个体安逸倾向只是主观反应。不能拿主观退缩对冲客观决策。",
  漏洞: "漏洞是客观存在的，钻不钻、补不补、报不报修是主观选择。恰恰因为客观有漏洞，更需要主观上守规矩。",
  社团文化: "校园风气和管理边界是客观治理问题，个体喜好只是主观偏好。不能拿主观审美要求学校放弃管理。",
  集体与个体: "整体安排是客观约束，个体不适属于主观压力。主观困难可以被讨论，但不能无限上升。"
};

const escalationMap = {
  调课: [
    "不能因为少数人影响整体安排，这本身就是最基本的集体意识。",
    "如果每个人都拿自己的舒服程度当标准，那任何组织都不用运转了。"
  ],
  复学: [
    "继续渲染这种说法，本质上就是扰乱军心。",
    "不能把国家和学校已经考虑过的事情，再倒退回个体情绪。"
  ],
  漏洞: [
    "群众里自然会有坏人借机捡漏，所以当然应该治理。",
    "任由这种行为扩散，最后就会从一个洞变成一个风气问题。"
  ],
  社团文化: [
    "当一时不能把负面影响控制在可控范围内，暂停本来就是合理治理手段。",
    "风气不是抽象词，它就是靠一次次容忍小问题慢慢坏掉的。"
  ],
  集体与个体: [
    "群众并不天然正确，集体也不等于情绪投票。",
    "组织运行不是迎合每个个体，而是要保证整体秩序。"
  ]
};

const closerMap = {
  调课: [
    "所以这件事的正确态度是接受客观安排，再讨论补救，而不是先拒绝。",
    "你如果真有客观冲突，就接龙；如果没有，就别再上升了。"
  ],
  复学: [
    "学校不会因为这种话停止复学，这一点应该很清楚。",
    "继续说下去没有意义，回到安排本身就行。"
  ],
  漏洞: [
    "马上打电话，继续报修，不行就加钢板。",
    "解决办法不是继续钻，而是立刻处理、立刻补洞。"
  ],
  社团文化: [
    "该治理就治理，该暂停就暂停，这不是不自信，是最基本的管理能力。",
    "说到底，学校不是没有边界的场所。"
  ],
  集体与个体: [
    "你先把自己从“我不想”切回到“整体怎么运行”再说。",
    "主观困难先克服，客观问题再解决。"
  ]
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderDossiers() {
  const grid = document.getElementById("dossierGrid");
  grid.innerHTML = dossiers
    .map(
      (dossier) => `
        <article class="dossier">
          <h3>${dossier.title}</h3>
          <p class="note">${dossier.note}</p>
          <div class="evidence-list">
            ${dossier.items
              .map(
                ([quote, source]) => `
                  <div class="evidence">
                    <q>${quote}</q>
                    <span>${source}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderQuoteWall() {
  const wall = document.getElementById("quoteWall");
  wall.innerHTML = quoteWall
    .map((quote) => `<div class="quote-tag">${quote}</div>`)
    .join("");
}

function populateTopics() {
  const topicSelect = document.getElementById("topicSelect");
  topicSelect.innerHTML = Object.keys(debateData)
    .map((topic) => `<option value="${topic}">${topic}</option>`)
    .join("");
}

function populateStances(topic) {
  const stanceSelect = document.getElementById("stanceSelect");
  stanceSelect.innerHTML = debateData[topic]
    .map((stance) => `<option value="${stance}">${stance}</option>`)
    .join("");
}

function generateDebate() {
  const topic = document.getElementById("topicSelect").value;
  const stance = document.getElementById("stanceSelect").value;
  const governance = [
    `来件摘要：${stance}`,
    `问题定性：${pick(openingMap[topic])}`,
    `原则依据：${objectiveMap[topic]}`,
    `治理批示：${pick(closerMap[topic])}`
  ];
  const roast = [
    `顺手回怼：${pick(escalationMap[topic])}`,
    `附带评价：你这类说法最容易把主观舒适感伪装成正当立场。`
  ];

  document.getElementById("debateOutput").innerHTML = [...governance, ...roast]
    .map((part, index) => {
      const cls = index < 4 ? "response-part response-part--govern" : "response-part response-part--roast";
      return `<div class="${cls}">${part}</div>`;
    })
    .join("");
}

function getCurrentBundle() {
  return quizBundles.find((bundle) => bundle.id === quizState.bundleId);
}

function renderQuizBundlePicker() {
  const picker = document.getElementById("quizBundlePicker");
  picker.innerHTML = quizBundles
    .map(
      (bundle) => `
        <button class="bundle-card" type="button" data-bundle="${bundle.id}">
          <span class="bundle-card__tag">第 ${quizBundles.findIndex((item) => item.id === bundle.id) + 1} 卷</span>
          <strong>${bundle.title}</strong>
          <p>${bundle.note}</p>
        </button>
      `
    )
    .join("");

  picker.querySelectorAll("[data-bundle]").forEach((button) => {
    button.addEventListener("click", () => startQuiz(button.dataset.bundle));
  });
}

function updateQuizProgress() {
  const bundle = getCurrentBundle();
  const total = bundle ? bundle.questions.length : 0;
  const current = bundle ? Math.min(quizState.questionIndex + 1, total) : 0;
  const percent = total ? (quizState.questionIndex / total) * 100 : 0;

  document.getElementById("quizBundleLabel").textContent = bundle
    ? `${bundle.title}｜${bundle.note}`
    : "请先选择一套卷子";
  document.getElementById("quizProgressText").textContent = total
    ? `${Math.min(quizState.questionIndex, total)} / ${total}`
    : "0 / 0";
  document.getElementById("quizProgressBar").style.width = `${percent}%`;
}

function renderQuizStage() {
  const stage = document.getElementById("quizStage");
  const bundle = getCurrentBundle();

  if (!bundle) {
    stage.innerHTML = `
      <div class="response-part response-part--editor">
        请从上方选择一套测验。题目会逐题出现，每次选择都会立即推进到下一题。
      </div>
    `;
    updateQuizProgress();
    return;
  }

  if (quizState.questionIndex >= bundle.questions.length) {
    stage.innerHTML = `
      <div class="response-part response-part--govern">
        本卷已完成。你可以查看右侧归档结论，或点击“重开当前卷”重新作答。
      </div>
    `;
    updateQuizProgress();
    return;
  }

  const question = bundle.questions[quizState.questionIndex];
  stage.innerHTML = `
    <article class="quiz-question quiz-question--progressive">
      <p class="quiz-question__index">第 ${quizState.questionIndex + 1} 题 / 共 ${bundle.questions.length} 题</p>
      <h3>${question.prompt}</h3>
      <div class="quiz-options quiz-options--stack">
        ${question.options
          .map(
            (option, index) => `
              <button class="quiz-option quiz-option--button" type="button" data-option="${index}">
                <span class="quiz-option__marker">${String.fromCharCode(65 + index)}</span>
                <span>${option.text}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </article>
  `;

  stage.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => answerQuizQuestion(Number(button.dataset.option)));
  });

  updateQuizProgress();
}

function resetQuizOutput() {
  document.getElementById("quizOutput").innerHTML = `
    <div class="response-part response-part--editor">
      测验尚未完成。完成整套卷子后，这里会生成一份归档结论与李广昱式评语。
    </div>
  `;
}

function startQuiz(bundleId) {
  quizState.bundleId = bundleId;
  quizState.questionIndex = 0;
  quizState.answers = [];
  quizState.scores = {};
  resetQuizOutput();
  renderQuizStage();
}

function answerQuizQuestion(optionIndex) {
  const bundle = getCurrentBundle();
  if (!bundle) {
    return;
  }

  const question = bundle.questions[quizState.questionIndex];
  const option = question.options[optionIndex];
  quizState.answers.push(optionIndex);

  Object.entries(option.scores).forEach(([key, value]) => {
    quizState.scores[key] = (quizState.scores[key] || 0) + value;
  });

  quizState.questionIndex += 1;

  if (quizState.questionIndex >= bundle.questions.length) {
    finishQuiz();
    return;
  }

  renderQuizStage();
}

function finishQuiz() {
  const ranked = Object.entries(quizState.scores).sort((a, b) => b[1] - a[1]);
  const winnerKey = ranked[0]?.[0] || "mediation";
  const runnerUpKey = ranked[1]?.[0] || "comfort";
  const winner = resultProfiles[winnerKey];
  const runnerUp = resultProfiles[runnerUpKey];

  document.getElementById("quizOutput").innerHTML = [
    `<div class="response-part response-part--govern">归档类型：${winner.title}</div>`,
    `<div class="response-part response-part--editor">${winner.summary}</div>`,
    `<div class="response-part response-part--editor">次级倾向：${runnerUp.title}。说明你并不是单一路线，而是在“${winner.title}”之外，还带有明显的“${runnerUp.title}”影子。</div>`,
    `<div class="response-part response-part--roast">${winner.judgment}</div>`
  ].join("");

  renderQuizStage();
}

function wireInteractions() {
  const topicSelect = document.getElementById("topicSelect");
  populateTopics();
  populateStances(topicSelect.value);

  topicSelect.addEventListener("change", (event) => {
    populateStances(event.target.value);
  });

  document.getElementById("debateBtn").addEventListener("click", generateDebate);
  renderQuizBundlePicker();
  resetQuizOutput();
  renderQuizStage();
  document.getElementById("quizRestartBtn").addEventListener("click", () => {
    if (quizState.bundleId) {
      startQuiz(quizState.bundleId);
    }
  });

  generateDebate();
}

document.addEventListener("DOMContentLoaded", () => {
  renderDossiers();
  renderQuoteWall();
  wireInteractions();
});
