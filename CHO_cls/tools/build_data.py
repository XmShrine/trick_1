# -*- coding: utf-8 -*-
"""records_raw.json -> data.json（网页用）"""
import json, re, collections

R = json.load(open('records_raw.json'))

# 手工校正：个别单元格在 PDF 里跨页/多行折行，自动切分会串行（已逐条核对原页）
WEEK_FIX = {
    ('0083',1):'1-2,4-16双,17', ('0084',0):'1-2,4-16双,17', ('0220',0):'1-3,5-15单,16-17', ('0111',0):'2-16双,17', ('0111',1):'3-15单',
    ('0219',1):'1-3,5-15单,16-17', ('0228',1):'4-6双,7-9单,10,13-15',
    ('0229',0):'2-17', ('2343',0):'6,9,12',
    ('2343',1):'1-3,5-7单,8-10双,11-13单,14-17', ('2344',0):'1-3单,7-17单',
    ('2387',0):'1,6-10,13-17', ('2387',1):'2-3,5,11-12', ('2406',0):'1-9',
    ('2407',0):'1-5单,6-8双,9-10,12-17', ('2407',1):'2-4双,7,11',
}
MODULES = ('科学精神与健康生活','艺术审美与文化思辨','社会发展与国家治理','世界文明与国际视野',
           '工程素养与未来科技','公能素质和服务中国','身体素质训练','专项运动训练')

def weeks_mask(txt):
    """'1-3,5-15单' -> (bitmask, 最小周, 最大周)"""
    mask = 0
    for part in txt.split(','):
        part = part.strip()
        if not part: continue
        step = 1; off = None
        if part.endswith('单'): part, off = part[:-1], 1
        elif part.endswith('双'): part, off = part[:-1], 0
        if off is not None: step = 2
        m = re.match(r'^(\d{1,2})(?:-(\d{1,2}))?$', part)
        if not m: return 0,0,0
        a = int(m.group(1)); b = int(m.group(2) or m.group(1))
        for w in range(a, b+1):
            if step==2 and w%2 != off: continue
            mask |= 1<<w
    ws = [w for w in range(1,25) if mask>>w & 1]
    return mask, (ws[0] if ws else 0), (ws[-1] if ws else 0)

def campus(room):
    for c in ('八里台','津南','泰达'):
        if room.startswith(c): return c
    if room.startswith('在线'): return '在线'
    return '其他'

GEN_REQ = {'公共外语教学部','马克思主义基础理论教学部','体育部','军事教研室',
           '公共计算机基础教学部','心理健康教育中心','高等数学教学部'}
HOME = '数学科学学院'
def kind(unit):
    if unit == '通识选修课': return 'ge_opt'      # 通识选修课
    if unit in GEN_REQ:      return 'ge_req'      # 通识必修课（学校统一安排教学班）
    if unit == HOME:         return 'major'       # 本院（数学科学学院）课程
    return 'other'                                # 其他学院专业课 —— 需跨专业名额

units = sorted(set(r['unit'] for r in R))
uidx = {u:i for i,u in enumerate(units)}
out, bad = [], []
for r in R:
    mod = r['module']
    if mod and mod not in MODULES and len(mod)%2==0 and mod[:len(mod)//2]==mod[len(mod)//2:]:
        mod = mod[:len(mod)//2]                    # PDF 里重复印刷了一遍
    sess = []
    for i,s in enumerate(r['sessions']):
        wtxt = WEEK_FIX.get((r['no'],i), s['weeks'])
        mask, w0, w1 = weeks_mask(wtxt)
        if wtxt and not mask: bad.append((r['no'],i,wtxt))
        room = s['room']; grp = ''
        mg = re.search(r'组\d$', room)
        if mg: grp, room = mg.group(0), room[:mg.start()]
        p = s['period']
        a,b = (0,0) if p=='/' else map(int, p.split('/'))
        sess.append({'d': int(s['wday']) if s['wday'].isdigit() else 0,
                     'a': a, 'b': b, 'w': wtxt, 'm': mask, 'w0': w0, 'w1': w1,
                     't': s['teacher'], 'r': room.replace('|','、'), 'g': grp,
                     'c': campus(room)})
    q  = int(r['quota'])  if r['quota'].isdigit()  else 0
    xq = int(r['xquota']) if r['xquota'].isdigit() else 0
    cps = sorted(set(s['c'] for s in sess if s['c']!='其他')) or ['其他']
    out.append({'n': r['no'], 't': r['name'], 'u': uidx[r['unit']], 'k': kind(r['unit']),
                'mo': mod, 'q': q, 'x': xq, 'nt': r['sessions'][0]['note'] if r['sessions'] else '',
                'cp': cps, 'tt': sorted(set(s['t'] for s in sess if s['t'])),
                'hr': sum((s['b']-s['a']+1) for s in sess if s['a']), 's': sess})
out.sort(key=lambda c: c['n'])
print('bad weeks after fix:', bad)
print('courses', len(out), 'sessions', sum(len(c['s']) for c in out))
print('kinds', collections.Counter(c['k'] for c in out))
json.dump({'units': units, 'courses': out}, open('data.json','w'), ensure_ascii=False,
          separators=(',',':'))
import os; print('data.json', os.path.getsize('data.json')//1024, 'KB')
