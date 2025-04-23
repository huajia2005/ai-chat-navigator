// 全局变量
let allMessages = [];
let filteredMessages = [];
let currentSiteName = '';

// DOM 元素
const chatHistoryEl = document.getElementById('chat-history');
const searchInput = document.getElementById('search-input');
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

  // 如果有搜索，只显示搜索结果
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    const results = filterMessagesBySearchTerm(messages, searchTerm);
    if (results.length === 0) {
      renderNoResultsState(searchTerm);
    } else {
      renderMessageGroup(results, '搜索结果', searchTerm);
    }
  } else {
    // 没有搜索，显示所有消息，不分组
    renderMessageGroup(messages, '所有对话');
  }
}

// 根据搜索词过滤消息
function filterMessagesBySearchTerm(messages, searchTerm) {
  if (!searchTerm) return messages;

  // 高级匹配算法
  const results = messages.filter(msg => {
    // 精确匹配得分高
    const exactMatch = msg.text.toLowerCase().includes(searchTerm);

    // 支持多个关键词搜索（空格分隔）
    const keywords = searchTerm.split(/\s+/);
    const keywordMatch = keywords.length > 1 &&
        keywords.every(keyword => msg.text.toLowerCase().includes(keyword));

    return exactMatch || keywordMatch;
  });

  // 结果排序 - 优先显示更精确的匹配
  results.sort((a, b) => {
    // 计算匹配得分
    const scoreA = getMatchScore(a.text.toLowerCase(), searchTerm);
    const scoreB = getMatchScore(b.text.toLowerCase(), searchTerm);
    return scoreB - scoreA; // 降序排列
  });

  return results;
}

// 渲染消息分组
function renderMessageGroup(messages, title, searchTerm = null) {
  if (!messages || messages.length === 0) return;

  messages.forEach((msgObj, idx) => {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg clickable';

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
    msgEl.title = `点击定位到原始消息 #${parseInt(msgObj.index) + 1}`;

    msgEl.onclick = function() {
      window.parent.postMessage({
        type: 'COPILOT_SCROLL_TO',
        index: msgObj.index
      }, '*');
    };

    chatHistoryEl.appendChild(msgEl);
  });
}

// 更新网站名称显示
function updateSiteName(name) {
  if (siteNameEl) {
    currentSiteName = name;
    siteNameEl.textContent = name;
    // 更新标题
    document.title = `${name} 导航器`;
  }
}

// 计算文本与搜索词的匹配度
function getMatchScore(text, searchTerm) {
  let score = 0;

  // 完整匹配得高分
  if (text === searchTerm) score += 100;

  // 包含完整搜索词得分
  if (text.includes(searchTerm)) score += 50;

  // 搜索词在开头得额外分
  if (text.startsWith(searchTerm)) score += 25;

  // 分词匹配
  const keywords = searchTerm.split(/\s+/);
  keywords.forEach(keyword => {
    if (text.includes(keyword)) score += 10;
  });

  return score;
}

// 高亮搜索词增强版
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm) return text;

  // 支持多关键词高亮（空格分隔）
  const keywords = searchTerm.split(/\s+/).map(k => escapeRegExp(k));
  let highlightedText = text;

  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    highlightedText = highlightedText.replace(regex,
        '<span class="search-highlight">$1</span>');
  });

  return highlightedText;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 渲染空状态
function renderEmptyState() {
  chatHistoryEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🧭</div>
      <div class="empty-title">暂无聊天记录</div>
      <div class="empty-subtitle">与${currentSiteName || 'AI助手'}对话后，您的聊天记录将显示在这里</div>
    </div>
  `;
}

// 渲染无搜索结果状态
function renderNoResultsState(searchTerm) {
  chatHistoryEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">无匹配结果</div>
      <div class="empty-subtitle">没有找到包含 "${searchTerm}" 的聊天记录</div>
    </div>
  `;
}

// 搜索聊天记录
function searchMessages() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  renderChatHistory(allMessages);
}

// 初始化事件监听
function initEventListeners() {
  // 搜索框输入
  searchInput.addEventListener('input', debounce(searchMessages, 300));
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
