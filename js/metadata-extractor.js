/**
 * Metadata Extractor Module
 * 
 * Extensible platform registry for extracting metadata from web pages.
 * Each platform defines a match function and an extract function.
 */

// Platform-specific extractors
const platformExtractors = {
  bilibili: {
    name: 'bilibili',
    match: (url) => url.includes('bilibili.com/video/'),
    extract: () => {
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
      if (!duration) {
        const meta = document.querySelector('meta[itemprop="duration"]');
        if (meta) duration = meta.content;
      }

      // Normalize duration to HH:MM:SS format
      if (duration && duration.split(':').length === 2) {
        duration = '00:' + duration;
      }

      // Try to get publish date
      let createDate = "";
      const dateElement = document.querySelector('.pubdate-text')?.innerText?.trim();
      if (dateElement) {
        // Format: "2024年1月1日" or "2024-01-01"
        const match = dateElement.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})/);
        if (match) {
          createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
      }

      return { author, duration, createDate };
    }
  },

  youtube: {
    name: 'youtube',
    match: (url) => url.includes('youtube.com/watch') || url.includes('youtu.be/'),
    extract: () => {
      const author = document.querySelector('ytd-video-owner-renderer #channel-name a')?.innerText?.trim() || "";
      let duration = document.querySelector('.ytp-time-duration')?.innerText?.trim();
      if (!duration) {
        const meta = document.querySelector('meta[itemprop="duration"]');
        if (meta) duration = meta.content;
      }

      // Try to get publish date
      let createDate = "";
      const dateElement = document.querySelector('#info-strings yt-formatted-string')?.innerText?.trim();
      if (dateElement) {
        // Format varies, try to parse common patterns
        const match = dateElement.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
        if (match) {
          createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
      }

      return { author, duration, createDate };
    }
  },

  twitter: {
    name: 'twitter',
    match: (url) => url.includes('x.com/') || url.includes('twitter.com/'),
    extract: () => {
      const authorElement = document.querySelector('[data-testid="User-Name"] span');
      const author = authorElement ? authorElement.innerText.trim() : "";

      // Try to get tweet date
      let createDate = "";
      const timeElement = document.querySelector('time');
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          createDate = datetime.split('T')[0]; // Get YYYY-MM-DD part
        }
      }

      return { author, createDate };
    }
  },

  wechat: {
    name: 'wechat',
    match: (url) => url.includes('mp.weixin.qq.com/s'),
    extract: () => {
      const author = document.getElementById('js_name')?.innerText?.trim() || "";

      // Try to get publish date
      let createDate = "";
      const dateElement = document.getElementById('publish_time')?.innerText?.trim();
      if (dateElement) {
        const match = dateElement.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
        if (match) {
          createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
      }

      return { author, createDate };
    }
  },

  quantclass: {
    name: 'quantclass',
    match: (url) => url.includes('bbs.quantclass.cn/thread/'),
    extract: () => {
      const author = document.querySelector('.username')?.innerText?.trim() || "";

      let createDate = "";
      const createDateElem = document.querySelector('.publish-time span:nth-child(1)');
      if (createDateElem) {
        // Format: "发布于 2025-09-20 22:53"
        createDate = createDateElem.innerText.replace('发布于', '').trim();
      }

      let modifyDate = "";
      const modifyDateElem = document.querySelector('.publish-time span:nth-child(2)');
      if (modifyDateElem) {
        // Format: "（编辑于 2025-12-24 09:25）"
        modifyDate = modifyDateElem.innerText.replace(/[（）编辑于]/g, '').trim();
      }

      return { author, createDate, modifyDate };
    }
  },

  generic: {
    name: 'generic',
    match: () => true, // Always matches as fallback
    extract: () => {
      return {};
    }
  }
};

// Order matters - check specific platforms first, generic last
const platformOrder = ['bilibili', 'youtube', 'twitter', 'wechat', 'quantclass', 'generic'];

/**
 * Detect which platform the URL belongs to
 * @param {string} url - The page URL
 * @returns {string} Platform name
 */
function detectPlatform(url) {
  for (const platformName of platformOrder) {
    if (platformExtractors[platformName].match(url)) {
      return platformName;
    }
  }
  return 'generic';
}

/**
 * Get the extractor function for a platform
 * @param {string} platformName - Platform name
 * @returns {Function} The extract function to run in page context
 */
function getExtractorFunction(platformName) {
  return platformExtractors[platformName]?.extract || platformExtractors.generic.extract;
}

/**
 * Build complete metadata object from extracted data
 * @param {Object} params - Parameters
 * @param {string} params.title - Cleaned page title
 * @param {string} params.url - Cleaned page URL
 * @param {string} params.platform - Platform name
 * @param {Object} params.extractedData - Data extracted from page
 * @returns {Object} Complete metadata object
 */
function buildMetadata({ title, url, platform, extractedData }) {
  const metadata = {
    title: title,
    platform: platform,
    url: url
  };

  // Add optional fields if they exist
  if (extractedData.author) {
    metadata.author = extractedData.author;
  }
  if (extractedData.duration) {
    metadata.duration = extractedData.duration;
  }
  if (extractedData.createDate) {
    metadata.create_date = extractedData.createDate;
  }
  if (extractedData.modifyDate) {
    metadata.modify_date = extractedData.modifyDate;
  }

  return metadata;
}

/**
 * Format metadata for display in textArea
 * Each field on its own line
 * @param {Object} metadata - Metadata object
 * @returns {string} Formatted display text
 */
function formatMetadataForDisplay(metadata) {
  const lines = [];

  if (metadata.title) {
    lines.push(`title: ${metadata.title}`);
  }
  if (metadata.platform) {
    lines.push(`platform: ${metadata.platform}`);
  }
  if (metadata.url) {
    lines.push(`url: ${metadata.url}`);
  }
  if (metadata.author) {
    lines.push(`author: ${metadata.author}`);
  }
  if (metadata.duration) {
    lines.push(`duration: ${metadata.duration}`);
  }
  if (metadata.create_date) {
    lines.push(`create_date: ${metadata.create_date}`);
  }
  if (metadata.modify_date) {
    lines.push(`modify_date: ${metadata.modify_date}`);
  }

  return lines.join('\n');
}

/**
 * Convert metadata to JSON string for submission
 * @param {Object} metadata - Metadata object
 * @returns {string} JSON string
 */
function getMetadataJSON(metadata) {
  return JSON.stringify(metadata);
}

/**
 * Parse metadata JSON from content that includes separator
 * @param {string} content - Full content with potential metadata
 * @returns {Object} { mainContent: string, metadata: Object|null }
 */
function parseContentWithMetadata(content) {
  const separator = '---METADATA---';
  const separatorIndex = content.indexOf(separator);

  if (separatorIndex === -1) {
    return { mainContent: content, metadata: null };
  }

  const mainContent = content.substring(0, separatorIndex).trim();
  const jsonPart = content.substring(separatorIndex + separator.length).trim();

  try {
    const metadata = JSON.parse(jsonPart);
    return { mainContent, metadata };
  } catch (e) {
    console.error('Failed to parse metadata JSON:', e);
    return { mainContent: content, metadata: null };
  }
}

// Export functions for use in other modules
// Using window object since this is a browser extension without module bundler
window.MetadataExtractor = {
  detectPlatform,
  getExtractorFunction,
  buildMetadata,
  formatMetadataForDisplay,
  getMetadataJSON,
  parseContentWithMetadata,
  platformExtractors
};
