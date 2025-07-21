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
        var linkHtml = " [" + getCleanTitle(tab.title, tab.url) + "](" + getCleanUrl(tab.url) + ") "
        if (tab.url) {
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