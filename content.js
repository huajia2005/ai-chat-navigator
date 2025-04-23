(function () {
  if (window.hasCopilotSidebar) return;
  window.hasCopilotSidebar = true;

  // 网站选择器配置
  const siteConfigs = {
    // GitHub Copilot 选择器
    'github.com/copilot': {
      userMessageSelector: '.UserMessage-module__container--cAvvK',
      scrollTargetSelector: '.UserMessage-module__container--cAvvK',
      containerSelector: '.ConversationCard-module__card--RibL3',
      siteName: 'GitHub Copilot'
    },
    // OpenAI 选择器
    'chatgpt.com': {
      userMessageSelector: '.text-message[data-message-author-role="user"]',
      scrollTargetSelector: '.text-message[data-message-author-role="user"]',
      containerSelector: '.conversation',
      siteName: 'OpenAI ChatGPT'
    }
  };

  // 根据当前URL确定要使用的配置
  function getCurrentSiteConfig() {
    const currentURL = window.location.href;

    // 检查每个配置的匹配情况
    for (const siteKey in siteConfigs) {
      if (currentURL.includes(siteKey)) {
        console.log(`检测到网站: ${siteConfigs[siteKey].siteName}`);
        return siteConfigs[siteKey];
      }
    }

    // 默认使用Copilot配置
    console.log('未检测到特定网站，使用默认配置');
    return siteConfigs['github.com/copilot'];
  }

  // 获取当前网站配置
  const currentSiteConfig = getCurrentSiteConfig();

  // 常量配置
  const DEFAULT_WIDTH = 360;
  const DEFAULT_HEIGHT = 500;
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 300;
  const MAX_WIDTH = 600;

  // 用户设置
  let userSettings = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    position: { top: '100px', right: '0px' }
  };

  // 尝试从localStorage读取设置
  try {
    const savedSettings = localStorage.getItem('ai_chat_sidebar_settings');
    if (savedSettings) {
      userSettings = JSON.parse(savedSettings);
    }
  } catch (e) {
    console.error('读取侧边栏设置失败', e);
  }

  // 插入样式 - 添加命名空间前缀避免冲突
  const style = document.createElement('style');
  style.textContent = `
    /* AI聊天侧边栏专用样式，避免影响页面其他元素 */
    .ai-sidebar-element {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    
    #ai-chat-sidebar-toggle-btn {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0078d7, #00a2ff);
      color: #fff;
      border-radius: 22px 0 0 22px;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,120,215,0.3);
      font-size: 22px;
      transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      user-select: none;
    }
    
    #ai-chat-sidebar-toggle-btn:hover {
      width: 56px;
      box-shadow: 0 6px 16px rgba(0,120,215,0.4);
    }
    
    #ai-chat-sidebar-container {
      position: fixed;
      overflow: hidden;
      z-index: 99999;
      display: none;
      background: white;
      border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0,0,0,0.15);
      transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      border: 1px solid rgba(0,0,0,0.1);
      resize: both;
      min-width: ${MIN_WIDTH}px;
      min-height: ${MIN_HEIGHT}px;
      max-width: ${MAX_WIDTH}px;
    }
    
    #ai-chat-sidebar-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    .ai-sidebar-resize-handle {
      position: absolute;
      width: 20px;
      height: 20px;
      bottom: 0;
      right: 0;
      cursor: nwse-resize;
      background: rgba(0,0,0,0.05);
      border-radius: 0 0 4px 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      opacity: 0.7;
    }
    
    .ai-sidebar-resize-handle:hover {
      background: rgba(0,120,215,0.1);
      opacity: 1;
    }
    
    .ai-sidebar-drag-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 30px;
      cursor: move;
      z-index: 1;
      background: linear-gradient(135deg, rgba(0,120,215,0.05), transparent);
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    #ai-chat-sidebar-container:hover .ai-sidebar-drag-handle {
      opacity: 1;
    }
    
    /* 高亮选中的消息 */
    .ai-sidebar-highlight {
      transition: all 0.5s ease;
      background: rgba(0, 120, 215, 0.1) !important;
      box-shadow: 0 0 0 2px #0078d7 !important;
      border-radius: 4px !important;
    }
  `;
  document.head.appendChild(style);

  // 创建收缩/展开按钮
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'ai-chat-sidebar-toggle-btn';
  toggleBtn.className = 'ai-sidebar-element';
  toggleBtn.title = '显示/隐藏聊天侧边栏';
  toggleBtn.innerHTML = '💬';
  document.body.appendChild(toggleBtn);

  // 创建侧边栏容器
  const container = document.createElement('div');
  container.id = 'ai-chat-sidebar-container';
  container.className = 'ai-sidebar-element';
  container.style.width = userSettings.width + 'px';
  container.style.height = userSettings.height + 'px';
  container.style.top = userSettings.position.top;
  container.style.right = userSettings.position.right;
  document.body.appendChild(container);

  // 创建拖动手柄
  const dragHandle = document.createElement('div');
  dragHandle.className = 'ai-sidebar-drag-handle ai-sidebar-element';
  container.appendChild(dragHandle);

  // 创建调整大小手柄
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'ai-sidebar-resize-handle ai-sidebar-element';
  resizeHandle.innerHTML = '⇲';
  container.appendChild(resizeHandle);

  // 创建iframe
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sidebar.html');
  iframe.id = 'ai-chat-sidebar-iframe';
  iframe.className = 'ai-sidebar-element';
  container.appendChild(iframe);

  // 切换按钮功能
  toggleBtn.onclick = function () {
    if (container.style.display === 'none' || !container.style.display) {
      container.style.display = 'block';
      toggleBtn.style.background = 'linear-gradient(135deg, #106ebe, #0091ea)';

      // 如果保存了位置，应用它
      if (userSettings.position) {
        container.style.top = userSettings.position.top;
        container.style.right = userSettings.position.right;
      }
    } else {
      container.style.display = 'none';
      toggleBtn.style.background = 'linear-gradient(135deg, #0078d7, #00a2ff)';

      // 保存当前尺寸
      saveSettings();
    }
  };

  // 保存当前侧边栏设置
  function saveSettings() {
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const top = container.style.top;
    const right = container.style.right;

    userSettings = {
      width,
      height,
      position: { top, right }
    };

    try {
      localStorage.setItem('ai_chat_sidebar_settings', JSON.stringify(userSettings));
    } catch (e) {
      console.error('保存侧边栏设置失败', e);
    }
  }

  // 拖拽功能
  let isDragging = false;
  let dragOffsetX, dragOffsetY;

  dragHandle.addEventListener('mousedown', function(e) {
    isDragging = true;
    dragOffsetX = e.clientX - container.getBoundingClientRect().left;
    dragOffsetY = e.clientY - container.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
    e.preventDefault(); // 阻止默认行为
    e.stopPropagation(); // 阻止事件冒泡
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;

    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;

    // 确保侧边栏不会被拖出视口
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;

    const constrainedX = Math.max(0, Math.min(x, maxX));
    const constrainedY = Math.max(0, Math.min(y, maxY));

    container.style.left = constrainedX + 'px';
    container.style.top = constrainedY + 'px';
    container.style.right = 'auto';

    e.preventDefault(); // 阻止默认行为
  });

  document.addEventListener('mouseup', function(e) {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';

      // 保存新位置
      saveSettings();

      e.preventDefault(); // 阻止默认行为
    }
  });

  // 调整大小后保存设置
  let resizeObserver = new ResizeObserver(debounce(() => {
    saveSettings();
  }, 500));

  resizeObserver.observe(container);

  // 采集聊天历史记录并发送到iframe
  function deepQuerySelectorAll(selector, root = document) {
    let results = [];
    if (root.querySelectorAll) {
      try {
        results.push(...root.querySelectorAll(selector));
      } catch (e) {
        console.error('选择器错误:', e);
      }
    }
    Array.from(root.children || []).forEach(el => {
      if (el.shadowRoot) {
        results.push(...deepQuerySelectorAll(selector, el.shadowRoot));
      }
    });
    return results;
  }

  // 防抖函数
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // 标记iframe是否ready，防止postMessage丢失
  let iframeReady = false;

  // 向iframe发送网站配置
  function sendSiteConfigToIframe() {
    if (iframeReady) {
      iframe.contentWindow.postMessage({
        type: 'SITE_CONFIG',
        data: {
          name: currentSiteConfig.siteName
        }
      }, '*');
    }
  }

  iframe.onload = function() {
    iframeReady = true;
    console.log('侧边栏iframe已加载完成');

    // 发送网站配置
    sendSiteConfigToIframe();

    // 立即执行一次采集
    fetchAndSendChatHistory();

    // 然后定时执行
    setInterval(fetchAndSendChatHistory, 2000);
  };

  function fetchAndSendChatHistory() {
    // 使用当前站点的选择器配置
    const userMessageSelector = currentSiteConfig.userMessageSelector;
    const chatNodes = deepQuerySelectorAll(userMessageSelector);

    let messages = [];
    chatNodes.forEach((node, idx) => {
      const userMsg = node.innerText.trim();

      // 如果节点没有data-chat-history属性，我们自己添加一个
      // 使用dataset API而不是直接设置attribute，避免属性泄漏
      if (!node.dataset.aiChatHistory) {
        node.dataset.aiChatHistory = idx;
      }

      const historyIndex = node.dataset.aiChatHistory;
      if (userMsg) {
        messages.push({ index: historyIndex, text: userMsg });
      }
    });

    // 只有iframe ready时才发送
    if (iframeReady && messages.length > 0) {
      iframe.contentWindow.postMessage({
        type: 'COPILOT_CHAT_HISTORY',
        data: messages
      }, '*');
    }
  }

  // 移除所有高亮样式
  function removeAllHighlights() {
    document.querySelectorAll('.ai-sidebar-highlight').forEach(el => {
      el.classList.remove('ai-sidebar-highlight');
    });
  }

  // 跳转到指定历史消息
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'COPILOT_SCROLL_TO') {
      const idx = event.data.index;

      // 先移除所有高亮
      removeAllHighlights();

      // 使用当前站点的滚动目标选择器和dataset属性
      const scrollTargetSelector = currentSiteConfig.scrollTargetSelector;
      // 使用属性选择器而不是类选择器
      const elements = document.querySelectorAll(scrollTargetSelector);
      let target = null;

      // 手动查找匹配的元素
      for (let el of elements) {
        if (el.dataset.aiChatHistory === idx.toString()) {
          target = el;
          break;
        }
      }

      if (target) {
        // 滚动到目标位置
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 添加高亮样式，但不直接修改元素样式，而是添加类
        target.classList.add('ai-sidebar-highlight');

        // 移除高亮
        setTimeout(() => {
          target.classList.remove('ai-sidebar-highlight');
        }, 2000);
      }
    } else if (event.data && event.data.type === 'COPILOT_REFRESH') {
      // 手动刷新历史记录
      fetchAndSendChatHistory();
    }
  });

  // 添加DOM观察器，当页面内容变化时更新历史记录
  const observer = new MutationObserver(mutations => {
    // 使用防抖，避免高频调用
    clearTimeout(window.chatObserverTimer);
    window.chatObserverTimer = setTimeout(fetchAndSendChatHistory, 500);
  });

  // 尝试观察可能的容器元素
  try {
    const containerSelector = currentSiteConfig.containerSelector;
    const containerElement = document.querySelector(containerSelector) || document.body;

    observer.observe(containerElement, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: true
    });
  } catch (e) {
    console.error('观察DOM失败:', e);
    // 备用方案：观察body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: true
    });
  }
})();
