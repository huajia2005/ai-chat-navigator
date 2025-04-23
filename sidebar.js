// 全局变量
let allMessages = [];
let filteredMessages = [];
let currentSiteName = '';

// DOM 元素
const chatHistoryEl = document.getElementById('chat-history');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const scrollTopBtn = document.getElementById('scroll-top-btn');
const statusToast = document.getElementById('status-toast');
const siteNameEl = document.getElementById('site-name');

// 渲染聊天历史
function renderChatHistory(messages = []) {
  chatHistoryEl.innerHTML = '';

  if (!messages || messages.length === 0) {
    renderEmptyState();
    return;
  }

  // 按索引排序
  messages.sort((a, b) => parseInt(a.index) - parseInt(b.index));
  filteredMessages = messages;

  // 分组：最近10条和更早的记录
  const recentMessages = messages.slice(-10);
  const olderMessages = messages.slice(0, -10);

  // 如果有搜索，不分组
  const searchTerm = searchInput.value.trim().toLowerCase();

  if (searchTerm) {
    renderMessageGroup(messages, '搜索结果', searchTerm);
  } else {
    // 有较早记录才显示分组
    if (olderMessages.length > 0) {
      renderMessageGroup(recentMessages, '最近对话', null, true);
      renderMessageGroup(olderMessages, '较早对话');
    } else {
      renderMessageGroup(messages, '所有对话');
    }
  }
}

// 渲染消息分组
function renderMessageGroup(messages, title, searchTerm = null, isRecent = false) {
  if (!messages || messages.length === 0) return;

  const section = document.createElement('div');
  section.className = 'chat-section';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.textContent = `${title} (${messages.length})`;
  section.appendChild(header);

  messages.forEach((msgObj, idx) => {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg clickable';
    if (isRecent) msgEl.classList.add('recent');

    const numberEl = document.createElement('span');
    numberEl.className = 'msg-number';
    numberEl.textContent = `#${parseInt(msgObj.index) + 1}`;

    const contentEl = document.createElement('span');
    contentEl.className = 'msg-content';

    // 搜索高亮
    if (searchTerm) {
      contentEl.innerHTML = highlightSearchTerm(msgObj.text, searchTerm);
    } else {
      contentEl.textContent = msgObj.text;
    }

    msgEl.appendChild(numberEl);
    msgEl.appendChild(contentEl);

    msgEl.dataset.index = msgObj.index;
    msgEl.title = `消息 #${parseInt(msgObj.index) + 1}: ${msgObj.text}`;

    msgEl.onclick = function() {
      window.parent.postMessage({
        type: 'COPILOT_SCROLL_TO',
        index: msgObj.index
      }, '*');

      showToast(`正在定位到消息 #${parseInt(msgObj.index) + 1}`, 'success');
    };

    section.appendChild(msgEl);
  });

  chatHistoryEl.appendChild(section);
}

// 更新网站名称显示
function updateSiteName(name) {
  if (siteNameEl) {
    currentSiteName = name;
    siteNameEl.textContent = name;
  }
}

// 高亮搜索词
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 渲染空状态
function renderEmptyState() {
  chatHistoryEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <div class="empty-title">暂无聊天记录</div>
      <div class="empty-subtitle">与${currentSiteName || 'AI助手'}对话后，您的聊天记录将显示在这里</div>
    </div>
  `;
}

// 显示提示消息
function showToast(message, type = '') {
  statusToast.textContent = message;
  statusToast.className = `status-toast show ${type}`;

  setTimeout(() => {
    statusToast.classList.remove('show');
  }, 2500);
}

// 搜索聊天记录
function searchMessages() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  if (!searchTerm) {
    renderChatHistory(allMessages);
    return;
  }

  const results = allMessages.filter(msg =>
      msg.text.toLowerCase().includes(searchTerm)
  );

  renderChatHistory(results);

  if (results.length === 0) {
    chatHistoryEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">无匹配结果</div>
        <div class="empty-subtitle">没有找到包含 "${searchTerm}" 的聊天记录</div>
      </div>
    `;
  } else {
    showToast(`找到 ${results.length} 条匹配记录`);
  }
}

// 初始化事件监听
function initEventListeners() {
  // 搜索框输入
  searchInput.addEventListener('input', debounce(searchMessages, 300));

  // 刷新按钮
  refreshBtn.addEventListener('click', () => {
    showToast('刷新中...');
    window.parent.postMessage({ type: 'COPILOT_REFRESH' }, '*');
  });

  // 回到顶部按钮
  scrollTopBtn.addEventListener('click', () => {
    chatHistoryEl.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 防抖函数
function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// 监听消息
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'COPILOT_CHAT_HISTORY') {
    allMessages = event.data.data;
    renderChatHistory(allMessages);
  } else if (event.data && event.data.type === 'SITE_CONFIG') {
    updateSiteName(event.data.data.name);
  }
});

// 页面加载完成
document.addEventListener('DOMContentLoaded', function() {
  initEventListeners();
  showToast('聊天记录侧边栏已加载');
});

// 快捷键支持
document.addEventListener('keydown', function(event) {
  // Ctrl/Cmd + F 聚焦搜索框
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault();
    searchInput.focus();
  }

  // Esc 清除搜索
  if (event.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    searchMessages();
    searchInput.blur();
  }
});
