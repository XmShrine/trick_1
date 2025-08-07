/**
 * 在网页上显示一个可自定义位置的信息浮层。
 * @param {string} message - 要显示的信息内容。
 * @param {string} [position='top-left'] - 浮层的位置，可选值: 'top-left', 'top-right', 'bottom-left', 'bottom-right'。
 */
function showInfoOverlay(message, position = 'top-left') {
  // 移除旧的浮层
  const existingOverlay = document.getElementById('info-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // 创建新的浮层元素
  const overlay = document.createElement('div');
  overlay.id = 'info-overlay';
  overlay.textContent = message;

  // 设置基础样式
  Object.assign(overlay.style, {
    position: 'fixed',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    borderRadius: '5px',
    zIndex: '9999',
    maxWidth: '300px',
    whiteSpace: 'pre-wrap',
  });

  // 根据传入的 position 参数设置位置
  switch (position) {
    case 'top-right':
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      break;
    case 'bottom-left':
      overlay.style.bottom = '10px';
      overlay.style.left = '10px';
      break;
    case 'bottom-right':
      overlay.style.bottom = '10px';
      overlay.style.right = '10px';
      break;
    case 'top-left':
    default:
      overlay.style.top = '10px';
      overlay.style.left = '10px';
      break;
  }

  // 将浮层添加到 body
  document.body.appendChild(overlay);
}