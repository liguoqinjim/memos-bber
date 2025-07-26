chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create(
      {
        type: 'normal',
        title: chrome.i18n.getMessage("sendTo"),
        id: 'Memos-send-selection',
        contexts: ['selection']
      },
    )
    chrome.contextMenus.create(
      {
        type: 'normal',
        title: chrome.i18n.getMessage("sendLinkTo"),
        id: 'Memos-send-link',
        contexts: ['link', 'page']
      },
    )
    chrome.contextMenus.create(
      {
        type: 'normal',
        title: chrome.i18n.getMessage("sendImageTo"),
        id: 'Memos-send-image',
        contexts: ['image']
      },
    )
})
chrome.contextMenus.onClicked.addListener(info => {
    let tempCont=''
    switch(info.menuItemId){
      case 'Memos-send-selection':
        tempCont = info.selectionText + '\n'
        break
      case 'Memos-send-link':
        tempCont = (info.linkUrl || info.pageUrl) + '\n'
        break
      case 'Memos-send-image':
        tempCont = `![](${info.srcUrl})` + '\n'
        break
    }
    chrome.storage.sync.get({open_action: "save_text", open_content: ''}, function(items) {
      if(items.open_action === 'upload_image') {
        alert(chrome.i18n.getMessage("picPending"));
      } else {
        chrome.storage.sync.set({open_action: "save_text", open_content: items.open_content + tempCont});
      }
    })
})

chrome.commands.onCommand.addListener(function (command) {
  if (command === 'copy-markdown-link') {
    generateMarkdownLink();
  } else if (command === 'copy-clean-link') {
    generateCleanLink();
  }
});

// 清除url中的query参数
function getCleanUrl(url){
  if(url.includes('bilibili.com')){
    return url.split('?')[0];
  }
  return url;
}

// 清理标题，去除不同网站的特定后缀
function getCleanTitle(title, url) {
  // 特定网站处理
  if (url.includes('bbs.quantclass.cn')) {
    title = title.replace(' - 量化小论坛', '');
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    // 去除X
    title = title.replace(' / X', '');
    // 去除所有http/https链接，包括短链接
    title = title.replace(/https?:\/\/\S+/gi, '');
  
    // 去除首尾的各种引号字符
    title = title.replace('：“', '：');
    
    // 清理多余的空格
    title = title.replace(/\s+/g, ' ').trim();
  } else if (url.includes('youtube.com')) {
    title = title.replace(' - YouTube', '');
    
    // 判断开头是否有这样的格式： "(1) 當年為什麼退出聯合國？"，去掉开头
    const regex = /^\(\d+\)\s/; // regex pattern to match "(1) " at the beginning of the title
    if (regex.test(title)) {
      title = title.replace(regex, '');
    }
  } else if (url.includes('bilibili.com')) {
    title = title.replace('_哔哩哔哩_bilibili', '');
  } else if (url.includes('github.com')) {
    // 判断url是否符合这个正则表达式：https://github.com/jaegertracing/jaeger
    const regex = /https:\/\/github.com\/[^\/]+\/[^\/]+/;
    if (regex.test(url)) {
      // 使用':'分割title
      const titleParts = title.split(':');
      const repoName = titleParts[0].split('/')[1];
      title = "GitHub - " + repoName;
    }
  } else if (url.includes('v2ex')) {
    title = title.replace(' - V2EX', '');
  } else if (url.includes('.smzdm.com')) { // 什么值得买
    title = title.replace('__什么值得买', '-什么值得买');
  } else if (url.includes('web.cafe')) {
    title = title.replace(' | Web.Cafe', '');
  }
  
  return title;
}

function generateMarkdownLink() {
  //获取当前标签页的标题和链接
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let title = tabs[0].title;
    let url = getCleanUrl(tabs[0].url);

    // YouTube需要特殊处理，因为需要异步获取播放时间
    if (url.includes('youtube.com')) {
      title = getCleanTitle(title, url); // 先清理基本标题
      
      // 获取页面的HTML内容，查询ytp-time-current这个class的内容
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => document.querySelector('.ytp-time-current')?.textContent,
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            const currentTime = results[0].result;
            
            if (currentTime != "0:00"){
              title += ` | ${currentTime}`;
            }
          }
          let markdownLink = `[${title}](${url})`;
          // 剪贴板
          addToClipboard(markdownLink);
        }
      );
      return
    }

    // 其他网站直接使用getCleanTitle函数
    title = getCleanTitle(title, url);
    let markdownLink = `[${title}](${url})`;

    // 剪贴板
    addToClipboard(markdownLink);
  });
}

function generateCleanLink() {
  //获取当前标签页的链接
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let url = getCleanUrl(tabs[0].url);
    
    // 剪贴板
    addToClipboard(url);
  });
}

// https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/cookbook.offscreen-clipboard-write
// Solution 1 - As of Jan 2023, service workers cannot directly interact with
// the system clipboard using either `navigator.clipboard` or
// `document.execCommand()`. To work around this, we'll create an offscreen
// document and pass it the data we want to write to the clipboard.
async function addToClipboard(value) {
  await chrome.offscreen.createDocument({
    url: 'clipboard/offscreen.html',
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Write text to the clipboard.'
  });

  // Now that we have an offscreen document, we can dispatch the
  // message.
  chrome.runtime.sendMessage({
    type: 'copy-data-to-clipboard',
    target: 'offscreen-doc',
    data: value
  });
}

// Solution 2 – Once extension service workers can use the Clipboard API,
// replace the offscreen document based implementation with something like this.
// eslint-disable-next-line no-unused-vars -- This is an alternative implementation
async function addToClipboardV2(value) {
  navigator.clipboard.writeText(value);
}