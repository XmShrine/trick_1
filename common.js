/* common.js */

document.addEventListener('DOMContentLoaded', function() {
    // 1. 自动注入弹窗 HTML (这样就不用在每个页面里写了)
    injectModalHTML();

    // 2. 初始化事件监听
    initEventListeners();
});

// === 核心功能：注入弹窗 HTML ===
function injectModalHTML() {
    const modalHTML = `
    <div id="passwordModal" class="modal">
        <div class="modal-content">
            <h2>需要密码</h2>
            <div id="errorMessage" class="error-msg">密码错误，请重试</div>
            
            <!-- 
                技巧：
                1. autocomplete="off": 告诉浏览器不要补全
                2. readonly: 初始状态只读，防止浏览器自动填充
                3. onfocus: 点击时移除只读
                4. name="access_token": 避免使用 "password" 这种敏感词
            -->
            <input type="" 
                   id="passwordInput" 
                   class="pass-input" 
                   placeholder="请输入密码" 
                   inputmode="numeric" 
                   name="access_token_field"
                   autocomplete="off"
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
    }

    // 密码确认按钮
    const btnConfirm = document.getElementById('btnConfirm');
    if (btnConfirm) btnConfirm.addEventListener('click', checkPassword);

    // 取消按钮
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) btnCancel.addEventListener('click', hidePasswordModal);

    // 密码框回车事件
    const passInput = document.getElementById('passwordInput');
    if (passInput) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkPassword();
        });
    }

    // 点击遮罩层关闭
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'passwordModal') hidePasswordModal();
        });
    }
}

// === 业务逻辑：搜索 ===
function filterGrid() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const title = card.getAttribute('data-title') || '';
        const text = title.toLowerCase();
        card.style.display = text.includes(filter) ? "flex" : "none";
    });
}

// === 业务逻辑：密码相关 ===
let targetUrl = '';
let currentPassword = 0;

// 哈希算法
function sha256(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0);
}

// 公用方法：供 HTML 调用
window.showPasswordModal = function(url, password) {
    targetUrl = url;
    currentPassword = password;
    
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    const errMsg = document.getElementById('errorMessage');

    modal.style.display = 'block';
    // 延时添加 show 类以触发 CSS 动画
    setTimeout(() => modal.classList.add('show'), 10);
    
    input.value = '';
    errMsg.style.display = 'none';
    
    // 聚焦
    setTimeout(() => {
        input.focus();
        // 再次确保移除 readonly (兼容性处理)
        input.removeAttribute('readonly'); 
    }, 100);
};

window.hidePasswordModal = function() {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
    input.blur();
};

window.checkPassword = function() {
    const input = document.getElementById('passwordInput');
    const entered = input.value;
    const hashed = sha256(entered);
    
    if (hashed === currentPassword) {
        window.open(targetUrl, '_blank');
        hidePasswordModal();
    } else {
        const err = document.getElementById('errorMessage');
        err.style.display = 'block';
        input.value = '';
        input.focus();
    }
};