// 存储音频上下文和已加载的音频数据
let audioCtx;
const audioBuffers = new Map();

/**
 * 加载并播放音频文件。
 * 在第一次调用时，它会加载并解码音频文件，然后播放。
 * 之后的每次调用都会立即播放已缓存的音频数据，实现低延迟。
 * src - 音频文件的路径。
 */

async function loadAudio(src) {
    // 确保 AudioContext 存在
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 检查是否已经加载过该音频文件
    if (!audioBuffers.has(src)) {
        try {
            // 从服务器加载音频文件
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            // 缓存解码后的音频数据
            audioBuffers.set(src, audioBuffer);
            console.log(`音频文件 ${src} 已加载并解码。`);
        } catch (error) {
            console.error(`音频文件 ${src} 加载或解码失败:`, error);
            throw error; // 抛出错误，让调用者可以捕获
        }
    }
}

async function playAudio(src) {

    loadAudio(src);

    // 获取缓存的音频数据
    const audioBuffer = audioBuffers.get(src);

    // 每次播放都创建一个新的 AudioBufferSourceNode
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // 连接到扬声器
    source.connect(audioCtx.destination);
    
    // 立即播放
    source.start(0);
}