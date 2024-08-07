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
  }
});

function generateMarkdownLink() {
  //获取当前标签页的标题和链接
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let title = tabs[0].title;
    let url = tabs[0].url;

    // 特定网站处理
    if (url.includes('bbs.quantclass.cn')) {
      title = title.replace(' - 量化小论坛', '');
    } else if (url.includes('twitter.com')) {
      title = title.replace(' / X', '');
    } else if (url.includes('youtube.com')) {
      title = title.replace(' - YouTube', '');

      // 判断开头是否有这样的格式： “(1) 當年為什麼退出聯合國？”，去掉开头
      const regex = /^\(\d+\)\s/; // regex pattern to match "(1) " at the beginning of the title
      if (regex.test(title)) {
        title = title.replace(regex, '');
      }

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

    } else if (url.includes('bilibili.com')) {
      title = title.replace('_哔哩哔哩_bilibili', '');
    }

    let markdownLink = `[${title}](${url})`;

    // 剪贴板
    addToClipboard(markdownLink);
    // addToClipboardV2(markdownLink);
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