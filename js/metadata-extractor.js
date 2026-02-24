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
      // Try to get author (handle joint posts)
      let author = "";
      const upName = document.querySelector('.up-name')?.innerText?.trim();

      if (upName) {
        author = upName;
      } else {
        const staffNodes = document.querySelectorAll('.staff-info');
        if (staffNodes.length > 0) {
          const names = [];
          for (const node of staffNodes) {
            const name = node.querySelector('.staff-name')?.innerText?.trim();
            if (name) names.push(name);
          }
          author = names.join(', ');
        }
      }

      if (!author) {
        // Fallback for new UI or other layouts
        const members = document.querySelectorAll('.members-info .membersinfo-upcard-wrap .staff-name');
        if (members.length > 0) {
          author = Array.from(members).map(m => m.innerText.trim()).join(', ');
        }
      }

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

      // Try to get publish date
      let createDate = "";
      const dateSelectors = ['.pubdate-text', '.pubdate-ip-text', '.video-data span:nth-child(2)'];
      for (const selector of dateSelectors) {
        const text = document.querySelector(selector)?.innerText?.trim();
        if (text) {
          const match = text.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})/);
          if (match) {
            createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
            break;
          }
        }
      }

      return { author, duration, createDate };
    }
  },

  youtube: {
    name: 'youtube',
    match: (url) => url.includes('youtube.com/watch') || url.includes('youtu.be/'),
    extract: () => {
      const author = document.querySelector('ytd-video-owner-renderer #channel-name a')?.innerText?.trim() ||
        document.querySelector('.yt-user-info a')?.innerText?.trim() || "";

      let duration = document.querySelector('.ytp-time-duration')?.innerText?.trim();
      if (!duration) {
        const meta = document.querySelector('meta[itemprop="duration"]');
        if (meta) duration = meta.content;
      }

      // Try to get publish date
      let createDate = "";
      const dateSelectors = ['#info-strings yt-formatted-string', '#info-container span:nth-child(3)', 'meta[itemprop="datePublished"]'];
      for (const selector of dateSelectors) {
        const el = document.querySelector(selector);
        const text = (selector.startsWith('meta')) ? el?.content : el?.innerText?.trim();
        if (text) {
          const match = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
          if (match) {
            createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
            break;
          }
        }
      }

      return { author, duration, createDate };
    }
  },

  twitter: {
    name: 'twitter',
    match: (url) => url.includes('x.com/') || url.includes('twitter.com/'),
    extract: () => {
      const mainTweet = document.querySelector('article[role="article"]');
      const authorElement = mainTweet ? mainTweet.querySelector('[data-testid="User-Name"] span') : document.querySelector('[data-testid="User-Name"] span');
      const author = authorElement ? authorElement.innerText.trim() : "";

      // Try to get tweet date
      let createDate = "";
      const timeElement = mainTweet ? mainTweet.querySelector('time') : document.querySelector('time');
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
      const author = document.getElementById('js_name')?.innerText?.trim() ||
        document.querySelector('.profile_nickname')?.innerText?.trim() || "";

      // Try to get publish date
      let createDate = "";
      const dateSelectors = ['#publish_time', '.publish_time', '#post-date'];
      for (const selector of dateSelectors) {
        const text = document.querySelector(selector)?.innerText?.trim();
        if (text) {
          const match = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
          if (match) {
            createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
            break;
          }
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
        const text = createDateElem.innerText.replace('发布于', '').trim();
        const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
          createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          createDate = text;
        }
      }

      let modifyDate = "";
      const modifyDateElem = document.querySelector('.publish-time span:nth-child(2)');
      if (modifyDateElem) {
        // Format: "（编辑于 2025-12-24 09:25）"
        const text = modifyDateElem.innerText.replace(/[（）编辑于]/g, '').trim();
        const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
          modifyDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          modifyDate = text;
        }
      }

      return { author, createDate, modifyDate };
    }
  },

  linuxdo: {
    name: 'LINUX DO',
    match: (url) => url.includes('linux.do'),
    extract: () => {
      const author = document.querySelector('.first.username a')?.innerText?.trim() || "";
      return { author };
    }
  },

  webcafe: {
    name: '哥飞社群',
    match: (url) => url.includes('new.web.cafe/topic/'),
    extract: () => {
      const author = document.querySelector("body > div.min-h-\\[90vh\\].mt-4 > div > div.flex.flex-col.justify-between.xl\\:gap-4.xl\\:flex-row.lg\\:gap-12 > div.xl\\:sticky.top-8.flex.h-full.w-full.flex-none.flex-col.gap-0.xl\\:gap-2.bg-transparent.bg-white.px-4.xl\\:shadow-sm.p-6.xl\\:w-\\[20rem\\] > div.mb-2.xl\\:mb-0.flex > div > span.cursor-pointer.text-xl.font-semibold.leading-6.text-gray-900")?.innerText?.trim() || "";

      let createDate = "";
      const timeElem = document.querySelector("body > div.min-h-\\[90vh\\].mt-4 > div > div.flex.flex-col.justify-between.xl\\:gap-4.xl\\:flex-row.lg\\:gap-12 > div.xl\\:sticky.top-8.flex.h-full.w-full.flex-none.flex-col.gap-0.xl\\:gap-2.bg-transparent.bg-white.px-4.xl\\:shadow-sm.p-6.xl\\:w-\\[20rem\\] > div.mb-2.xl\\:mb-0.flex > div > span.text-gray-500 > time");
      if (timeElem) {
        const datetime = timeElem.getAttribute('datetime');
        if (datetime) {
          createDate = datetime.split('T')[0];
        } else {
          const text = timeElem.innerText.trim();
          const match = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
          if (match) {
            createDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else {
            createDate = text;
          }
        }
      }

      return { author, createDate };
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
const platformOrder = ['bilibili', 'youtube', 'twitter', 'wechat', 'quantclass', 'linuxdo', 'webcafe', 'generic'];

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
 * Format duration string to HH:mm:ss
 * @param {string} duration - Duration string (e.g., "12:06", "00:2:06")
 * @returns {string} Formatted duration (e.g., "00:12:06", "00:02:06")
 */
function formatDuration(duration) {
  if (!duration) return duration;

  // Split by colon and trim parts
  let parts = duration.split(':').map(p => p.trim());

  // Pad each part with leading zero to ensure at least 2 digits
  parts = parts.map(p => p.padStart(2, '0'));

  // Ensure there are at least 3 parts (HH:mm:ss), unshift "00" if needed
  while (parts.length < 3) {
    parts.unshift('00');
  }

  return parts.join(':');
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
    platform: platformExtractors[platform]?.name || platform,
    url: url
  };

  // Add optional fields if they exist
  if (extractedData.author) {
    metadata.author = extractedData.author;
  }
  if (extractedData.duration) {
    metadata.duration = formatDuration(extractedData.duration);
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
