function toBottom() {
    var tc = document.getElementById("content");
    tc.focus();

    tc.scrollTop = tc.scrollHeight;
}

function popupAuto() {
    //清空输入框
    $("textarea[name=text]").val('')

    //获取tab页内容
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        // var linkHtml = " [" + tab.title + "](" + tab.url + ") "
        var title = getCleanTitle(tab.title, tab.url);
        var url = getCleanUrl(tab.url);

        if (tab.url && tab.url.includes("bilibili.com/video/")) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    let author = document.querySelector('.up-name')?.innerText?.trim();
                    if (!author) {
                        const staffNodes = document.querySelectorAll('.staff-info');
                        if (staffNodes.length > 0) {
                            for (const node of staffNodes) {
                                if (node.innerText.includes('UP主')) {
                                    author = node.querySelector('.staff-name')?.innerText?.trim();
                                    break;
                                }
                            }
                            if (!author) {
                                author = document.querySelector('.staff-name')?.innerText?.trim();
                            }
                        }
                    }
                    author = author || "";
                    let duration = document.querySelector('.bpx-player-ctrl-time-duration')?.innerText?.trim();
                    if (!duration) {
                        duration = document.querySelector('.bpx-player-ctrl-duration-last')?.innerText?.trim();
                    }
                    if (!duration) {
                        duration = document.querySelector('.bpx-player-ctrl-duration-duration')?.innerText?.trim();
                    }
                    if (!duration) { // try meta tag
                        const meta = document.querySelector('meta[itemprop="duration"]');
                        if (meta) duration = meta.content;
                    }
                    return { author, duration };
                }
            }, (results) => {
                let extraParts = [];
                if (results && results[0] && results[0].result) {
                    let { author, duration } = results[0].result;
                    if (author) extraParts.push(`Author:${author}`);
                    if (duration) {
                        if (duration.split(':').length === 2) {
                            duration = '00:' + duration;
                        }
                        extraParts.push(`时长:${duration}`);
                    }
                }
                let titleWithExtra = title;
                if (extraParts.length > 0) {
                    titleWithExtra += "|||" + extraParts.join("|||");
                }
                var linkHtml = " [" + titleWithExtra + "](" + url + ") ";
                add(linkHtml);
                toBottom();
            });
        } else if (tab.url && (tab.url.includes("youtube.com/watch") || tab.url.includes("youtu.be/"))) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const author = document.querySelector('ytd-video-owner-renderer #channel-name a')?.innerText?.trim() || "";
                    let duration = document.querySelector('.ytp-time-duration')?.innerText?.trim();
                    if (!duration) {
                        const meta = document.querySelector('meta[itemprop="duration"]');
                        if (meta) duration = meta.content; // Fallback to ISO format if visible not found
                    }
                    return { author, duration };
                }
            }, (results) => {
                let extraParts = [];
                if (results && results[0] && results[0].result) {
                    const { author, duration } = results[0].result;
                    if (author) extraParts.push(`Author:${author}`);
                    if (duration) extraParts.push(`时长:${duration}`);
                }
                let titleWithExtra = title;
                if (extraParts.length > 0) {
                    titleWithExtra += "|||" + extraParts.join("|||");
                }
                var linkHtml = " [" + titleWithExtra + "](" + url + ") ";
                add(linkHtml);
                toBottom();
            });
        } else if (tab.url && (tab.url.includes("x.com/") || tab.url.includes("twitter.com/"))) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const authorElement = document.querySelector('[data-testid="User-Name"] span');
                    const author = authorElement ? authorElement.innerText.trim() : "";
                    return { author };
                }
            }, (results) => {
                let extraParts = [];
                if (results && results[0] && results[0].result) {
                    const { author } = results[0].result;
                    if (author) extraParts.push(`Author:${author}`);
                }
                // For X, the title often starts with "X 上的 " or contains "Twitter". 
                // We'll try to refine the title if it follows "X 上的 Name: Content"
                let refinedTitle = title;
                if (title.startsWith("X 上的 ")) {
                    refinedTitle = title.replace(/^X 上的 /, "");
                    // If it's Format "Name: Content", we might want just "Content" or the full thing
                    // User's example: [AI Insights：太TM高效了...|||Author:范凯说 AI]
                    // The source title was "X 上的 范凯说 AI | AI Insights：太TM高效了..."
                    // So we remove "X 上的 " and potentially the Name if it's redundant.
                    // But to be safe, we just remove the prefix and the author part if possible.
                    if (extraParts.length > 0) {
                        const authorName = results[0].result.author;
                        const escapedAuthor = authorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp("^" + escapedAuthor + "\\s*[:|：|\\s]*");
                        refinedTitle = refinedTitle.replace(regex, "");
                    }
                }

                let titleWithExtra = refinedTitle;
                if (extraParts.length > 0) {
                    titleWithExtra += "|||" + extraParts.join("|||");
                }
                var linkHtml = " [" + titleWithExtra + "](" + url + ") ";
                add(linkHtml);
                toBottom();
            });
        } else if (tab.url && tab.url.includes("mp.weixin.qq.com/s")) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const author = document.getElementById('js_name')?.innerText?.trim() || "";
                    return { author };
                }
            }, (results) => {
                let extraParts = [];
                if (results && results[0] && results[0].result) {
                    const { author } = results[0].result;
                    if (author) extraParts.push(`Author:${author}`);
                }
                let titleWithExtra = title;
                if (extraParts.length > 0) {
                    titleWithExtra += "|||" + extraParts.join("|||");
                }
                var linkHtml = " [" + titleWithExtra + "](" + url + ") ";
                add(linkHtml);
                toBottom();
            });
        } else if (tab.url) {
            var linkHtml = " [" + title + "](" + url + ") "
            add(linkHtml);

            //移动光标到最后
            toBottom();
        } else {
            $.message({
                message: chrome.i18n.getMessage("getTabFailed")
            })
        }
    })
}

window.onload = function () {
    popupAuto();
};