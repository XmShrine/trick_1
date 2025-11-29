#!/usr/bin/env python3
import os
from pydub import AudioSegment

# 设置目录路径
source_dir = "m_audio"

# 遍历目录中的所有 WAV 文件
for filename in os.listdir(source_dir):
    if filename.endswith(".wav"):
        wav_path = os.path.join(source_dir, filename)
        mp3_filename = filename[:-4] + ".mp3"
        mp3_path = os.path.join(source_dir, mp3_filename)
        
        print(f"正在转换: {filename} -> {mp3_filename}")
        
        # 读取 WAV 文件
        audio = AudioSegment.from_wav(wav_path)
        
        # 导出为 MP3 格式
        audio.export(mp3_path, format="mp3", bitrate="192k")
        
        print(f"转换完成: {mp3_filename}")

print("所有音频文件转换完成！")