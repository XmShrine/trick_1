/* common.js */

document.addEventListener('DOMContentLoaded', function() {
    // 1. 注入通用 CSS (包含图片动画样式 + 弹窗样式)
    injectGlobalStyles();

    // 2. 自动注入弹窗 HTML
    injectModalHTML();

    // 3. 图片加载优化 (新增功能)
    optimizeImages();

    // 4. 初始化事件监听
    initEventListeners();
});

// === 新增功能：注入通用样式 ===
function injectGlobalStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* 图片优雅加载样式 */
        .card-icon img {
            opacity: 0; /* 初始隐藏 */
            transition: opacity 0.5s ease-in-out; /* 淡入动画 */
            will-change: opacity;
        }
        
        .card-icon img.loaded {
            opacity: 1; /* 加载完成后显示 */
        }

        /* 搜索高亮样式 (可选) */
        .search-highlight {
            background-color: rgba(255, 255, 0, 0.3);
        }
    `;
    document.head.appendChild(style);
}

// === 新增功能：图片加载优化 ===
function optimizeImages() {
    // 选取所有卡片内的图片
    const images = document.querySelectorAll('.card-icon img');

    if ('loading' in HTMLImageElement.prototype) {
        // 支持原生懒加载
        images.forEach(img => {
            img.loading = 'lazy'; // 开启懒加载
            
            // 核心逻辑：加载完成前透明，加载后淡入
            const onImageLoaded = () => {
                img.classList.add('loaded');
            };

            // 如果图片已被浏览器缓存，complete 为 true，直接显示
            if (img.complete) {
                onImageLoaded();
            } else {
                // 否则等待加载完成
                img.onload = onImageLoaded;
                img.onerror = () => {
                    // 图片加载失败时，保持透明或显示占位，防止显示破碎图标
                    console.warn('Image failed to load:', img.src);
                };
            }
        });
    } else {
        // 不支持懒加载的旧浏览器直接显示
        images.forEach(img => img.classList.add('loaded'));
    }
}

// === 核心功能：注入弹窗 HTML ===
function injectModalHTML() {
    // 检查是否已存在，防止重复注入
    if (document.getElementById('passwordModal')) return;

    const modalHTML = `
    <div id="passwordModal" class="modal">
        <div class="modal-content">
            <h2>需要密码</h2>
            <div id="errorMessage" class="error-msg">密码错误，请重试</div>
            
            <input 
                   id="passwordInput" 
                   class="pass-input" 
                   placeholder="请输入密码" 
                   name="access_token_field_${Math.random()}" 
                   autocomplete="new-password"
                   readonly
                   onfocus="this.removeAttribute('readonly');" 
            >
            
            <div class="modal-btns">
                <button class="btn btn-cancel" id="btnCancel">取消</button>
                <button class="btn btn-confirm" id="btnConfirm">确认</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// === 核心功能：事件监听 ===
function initEventListeners() {
    // 搜索框逻辑
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterGrid);
        // 防止移动端回车提交表单
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
    }

    // 弹窗按钮
    // 使用 document 代理监听，防止元素尚未注入时报错
    document.body.addEventListener('click', function(e) {
        if (e.target.id === 'btnConfirm') checkPassword();
        if (e.target.id === 'btnCancel') hidePasswordModal();
        if (e.target.id === 'passwordModal') hidePasswordModal();
    });

    // 密码框回车事件 (动态绑定的元素需要这样获取)
    document.body.addEventListener('keypress', function(e) {
        if (e.target.id === 'passwordInput' && e.key === 'Enter') {
            checkPassword();
        }
    });
}

// === 业务逻辑：搜索 ===
function filterGrid() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    
    const filter = input.value.trim().toLowerCase();
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const title = card.getAttribute('data-title') || '';
        const text = title.toLowerCase();
        
        // 简单显隐逻辑
        card.style.display = text.includes(filter) ? "flex" : "none";
    });
}

// === 业务逻辑：密码相关 ===
let targetUrl = '';
let currentPassword = 0;

function sha256(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0);
}

// 暴露给全局的方法
window.showPasswordModal = function(url, password) {
    targetUrl = url;
    currentPassword = password;
    
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    const errMsg = document.getElementById('errorMessage');

    if (!modal || !input) return;

    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
    
    input.value = '';
    errMsg.style.display = 'none';
    
    setTimeout(() => {
        input.focus();
        input.removeAttribute('readonly'); 
    }, 100);
};

window.hidePasswordModal = function() {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    
    if (!modal) return;

    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
    if (input) input.blur();
};

window.checkPassword = function() {
    const input = document.getElementById('passwordInput');
    if (!input) return;

    const entered = input.value;
    const hashed = sha256(entered);
    
    if (hashed === currentPassword) {
        // 如果是本地跳转
        if (!targetUrl.startsWith('http')) {
             window.location.href = targetUrl;
        } else {
             window.open(targetUrl, '_blank');
        }
        hidePasswordModal();
    } else {
        const err = document.getElementById('errorMessage');
        if (err) err.style.display = 'block';
        input.value = '';
        input.focus();
    }
};