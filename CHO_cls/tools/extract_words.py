# -*- coding: utf-8 -*-
"""ke.xml（pdftotext -bbox-layout 的输出）-> words.json：每页的 [x0,y0,x1,y1,文本]"""
import json, xml.etree.ElementTree as ET

NS = '{http://www.w3.org/1999/xhtml}'
pages = []
for p in ET.parse('ke.xml').getroot().iter(NS + 'page'):
    pages.append([[float(w.get('xMin')), float(w.get('yMin')),
                   float(w.get('xMax')), float(w.get('yMax')), w.text or '']
                  for w in p.iter(NS + 'word')])
json.dump(pages, open('words.json', 'w'), ensure_ascii=False)
print('pages', len(pages), 'words', sum(len(p) for p in pages))
