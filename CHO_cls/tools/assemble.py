# -*- coding: utf-8 -*-
"""tpl_head.html + data.json + tpl_js.html -> ../index.html"""
import os
d = os.path.dirname(os.path.abspath(__file__))
r = lambda f: open(os.path.join(d, f), encoding='utf-8').read()
out = r('tpl_head.html') + '\n<script>const DATA=' + r('data.json') + ';</script>\n' + r('tpl_js.html')
p = os.path.join(d, '..', 'index.html')
open(p, 'w', encoding='utf-8').write(out)
print(os.path.getsize(p) // 1024, 'KB ->', os.path.normpath(p))
