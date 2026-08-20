# -*- coding: utf-8 -*-
import json, re, collections

pages = json.load(open('words.json'))
BOUNDS = [(0,85,'no'),(85,180,'name'),(180,233,'module'),(233,258,'quota'),
          (258,288,'xquota'),(288,332,'teacher'),(332,352,'wday'),(352,380,'period'),
          (380,420,'weeks'),(420,515,'room'),(515,600,'note')]
def col(x):
    for a,b,n in BOUNDS:
        if a<=x<b: return n
PERIOD_RE = re.compile(r'^(\d{1,2}/\d{1,2}|/)$')
NO_RE = re.compile(r'^\d{4}$')
FOOT_RE = re.compile(r'^-\s*\d+\s*-$')

records=[]; warn=collections.Counter(); carry=None; unit=None
for pi,ws in enumerate(pages):
    hdr=[w for w in ws if w[4]=='选课序号' and w[1]<75]
    if hdr:
        top=[w for w in ws if w[1]<45 and w[0]<300]
        u=''.join(w[4] for w in sorted(top,key=lambda w:w[0])).replace('开课单位:','').strip()
        if u: unit=u
        hb=max(w[3] for w in ws if w[1]<78)
        carry=None            # new unit page -> no cross-unit carry
    else:
        hb=25.0
    data=[w for w in ws if w[1]>hb+0.5 and not FOOT_RE.match(w[4].strip())]
    cells=collections.defaultdict(list)
    for x0,y0,x1,y1,t in data:
        c=col((x0+x1)/2)
        if c is None: warn['nocol|%s'%t]+=1; continue
        cells[c].append(((y0+y1)/2,x0,t))
    for c in cells: cells[c].sort()
    anchors=sorted(y for y,x,t in cells.get('period',[]) if PERIOD_RE.match(t))
    for y,x,t in cells.get('period',[]):
        if not PERIOD_RE.match(t): warn['badperiod|%s'%t]+=1
    nos=[(y,t) for y,x,t in cells.get('no',[]) if NO_RE.match(t)]
    for y,x,t in cells.get('no',[]):
        if not NO_RE.match(t): warn['badno|%s'%t]+=1
    if not anchors:
        if cells: warn['noanchor_p%d'%pi]+=1
        continue
    n=len(anchors); m=len(nos)
    INF=float('inf')
    dp=[[INF]*(n+1) for _ in range(m+1)]; par=[[-1]*(n+1) for _ in range(m+1)]
    for i in range(n+1):
        dp[0][i]=0.0 if i==0 else (2.0*i if carry is not None else 1e6*i)
    for j in range(1,m+1):
        cy=nos[j-1][0]
        for i in range(1,n+1):
            best=INF; bk=-1
            for k in range(j-1,i):
                if dp[j-1][k]==INF: continue
                cost=dp[j-1][k]+abs(sum(anchors[k:i])/(i-k)-cy)
                if cost<best: best=cost; bk=k
            dp[j][i]=best; par[j][i]=bk
    if m and dp[m][n]==INF:
        warn['infeasible_p%d_n%d_m%d'%(pi,n,m)]+=1; continue
    i=n; blocks=[]
    for j in range(m,0,-1):
        k=par[j][i]; blocks.append((k,i)); i=k
    blocks.reverse(); lead=(0,i)
    if m and dp[m][n]/n>3: warn['dpcost_p%d_%.1f'%(pi,dp[m][n]/n)]+=1

    # record spans: lead block + one per 选课序号 ; used to keep wrapped cell
    # fragments inside the record they belong to
    spans=[]                      # (lo, hi, a, b)
    allb=([lead] if lead[1]>lead[0] else [])+list(blocks)
    for si,(a,b) in enumerate(allb):
        lo = (anchors[allb[si-1][1]-1]+anchors[a])/2 if si>0 else anchors[a]-6.9
        hi = (anchors[b-1]+anchors[allb[si+1][0]])/2 if si<len(allb)-1 else 1e9
        spans.append((lo, hi, a, b))
    if lead[1]>lead[0]: spans[0]=(-1e9,)+spans[0][1:]
    def span_of(y):
        for si,(lo,hi,a,b) in enumerate(spans):
            if lo<=y<=hi: return si
        return min(range(len(spans)), key=lambda si: min(abs(spans[si][0]-y),abs(spans[si][1]-y)))
    def near(y):
        lo,hi,a,b = spans[span_of(y)]
        return min(range(a,b), key=lambda k: abs(anchors[k]-y))
    TOP = spans[0][0]                      # words above this continue the previous page's record
    pre = collections.defaultdict(list)
    sess=[{'teacher':[], 'room':[], 'note':[], 'wday':[], 'weeks':[], 'period':None} for _ in range(n)]
    idx={y:k for k,y in enumerate(anchors)}
    for y,x,t in cells.get('period',[]):
        if PERIOD_RE.match(t): sess[idx[y]]['period']=t
    for c in ('wday','weeks','teacher','room','note'):
        for y,x,t in cells.get(c,[]):
            if y<TOP: pre[c].append((y,x,t)); continue
            sess[near(y)][c].append((y,x,t))
    for s in sess:
        for c in ('wday','weeks','teacher','room','note'):
            s[c]=''.join(t for y,x,t in sorted(s[c]))
    recdata=[{'name':[], 'module':[], 'quota':[], 'xquota':[]} for _ in range(m)]
    if m:
        # 合并单元格（课程名称/模块/名额）在整条记录的行框内垂直居中，行框高度
        # 受换行影响，故直接按最近的 选课序号 归属
        LEADHI = spans[0][1] if lead[1]>lead[0] else -1e9   # 上一页记录在本页续行的下界
        for c in ('name','module','quota','xquota'):
            for y,x,t in cells.get(c,[]):
                if y<TOP or y<LEADHI: pre[c].append((y,x,t)); continue
                recdata[min(range(m), key=lambda k: abs(nos[k][0]-y))][c].append((y,x,t))
        for r in recdata:
            for c in ('name','module','quota','xquota'):
                r[c]=''.join(t for y,x,t in sorted(r[c]))
    if pre:
        if carry is None: warn['pre_no_carry_p%d'%pi]+=1
        else:
            for c in ('name','module','quota','xquota'):
                if pre.get(c): carry[c]+=''.join(t for y,x,t in sorted(pre[c]))
            tgt = sess[0] if lead[1]>0 else carry['sessions'][-1]
            for c in ('wday','weeks','teacher','room','note'):
                if pre.get(c): tgt[c]+=''.join(t for y,x,t in sorted(pre[c]))
    if lead[1]>0:
        if carry is None: warn['orphan_p%d_%d'%(pi,lead[1])]+=1
        else: carry['sessions'].extend(sess[lead[0]:lead[1]])
    for j,(a,b) in enumerate(blocks):
        rec=dict(no=nos[j][1], unit=unit, page=pi, name=recdata[j]['name'],
                 module=recdata[j]['module'], quota=recdata[j]['quota'],
                 xquota=recdata[j]['xquota'], sessions=sess[a:b])
        records.append(rec); carry=rec

print('records',len(records),'sessions',sum(len(r['sessions']) for r in records),'units',len(set(r['unit'] for r in records)))
for k,v in warn.most_common(40): print('WARN',k,v)
json.dump(records,open('records_raw.json','w'),ensure_ascii=False,indent=1)
