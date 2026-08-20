# 数据来源与重建

网页里的课程数据由《选课具体.pdf》（选课手册）自动解析而来，index.html 是自包含的单文件，
数据已内联，直接双击就能用。若手册更新，按下面三步重建：

```sh
pdftotext -bbox-layout 选课具体.pdf ke.xml     # 需要 poppler：brew install poppler
python3 extract_words.py                      # ke.xml -> words.json（词 + 坐标）
python3 parse_manual.py                       # words.json -> records_raw.json（教学班记录）
python3 build_data.py                         # records_raw.json -> data.json
python3 assemble.py                           # tpl_head.html + data.json + tpl_js.html -> index.html
```

解析思路：手册每页是同一张表，11 个栏目的 x 区间在全书完全一致，所以按 x 定栏；
一条记录的「选课序号 / 课程名称 / 名额」是合并单元格，垂直居中于它全部上课时段行，
于是用动态规划把时段行切成连续块去贴合各个序号的 y，跨页续行、单元格折行都据此归位。
build_data.py 里的 WEEK_FIX 是逐条核对原页后手工校正的十几个跨页折行单元格。
