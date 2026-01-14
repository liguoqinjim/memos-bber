// Global variable to store current metadata for submission
window.currentMetadata = null;

function toBottom() {
    var tc = document.getElementById("content");
    tc.focus();
    tc.scrollTop = tc.scrollHeight;
}

function updateMetadataDisplay(metadata) {
    const metadataTextarea = document.getElementById("metadata");
    if (metadataTextarea && metadata) {
        metadataTextarea.value = window.MetadataExtractor.formatMetadataForDisplay(metadata);
        window.currentMetadata = metadata;
    }
}

function popupAuto() {
    // Clear input fields
    $("textarea[name=text]").val('')
    $("#metadata").val('')
    window.currentMetadata = null;

    // Get current tab content
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab.url) {
            $.message({
                message: chrome.i18n.getMessage("getTabFailed")
            });
            return;
        }

        var title = getCleanTitle(tab.title, tab.url);
        var fullTitle = getCleanTitle(tab.title, tab.url, false);
        var url = getCleanUrl(tab.url);

        // Detect platform and get extractor
        const platform = window.MetadataExtractor.detectPlatform(tab.url);
        const extractorFunc = window.MetadataExtractor.getExtractorFunction(platform);

        if (platform !== 'generic') {
            // Execute platform-specific extraction in page context
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractorFunc
            }, (results) => {
                let extractedData = {};
                if (results && results[0] && results[0].result) {
                    extractedData = results[0].result;
                }

                // Build metadata object
                const metadata = window.MetadataExtractor.buildMetadata({
                    title: fullTitle,
                    url: url,
                    platform: platform,
                    extractedData: extractedData
                });

                // Update displays
                var linkHtml = " [" + title + "](" + url + ") ";
                add(linkHtml);
                updateMetadataDisplay(metadata);
                toBottom();
            });
        } else {
            // Generic page - no special extraction
            const metadata = window.MetadataExtractor.buildMetadata({
                title: fullTitle,
                url: url,
                platform: 'generic',
                extractedData: {}
            });

            var linkHtml = " [" + title + "](" + url + ") ";
            add(linkHtml);
            updateMetadataDisplay(metadata);
            toBottom();
        }
    });
}

window.onload = function () {
    popupAuto();
};