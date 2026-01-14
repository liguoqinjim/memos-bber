dayjs.extend(window.dayjs_plugin_relativeTime)
dayjs.locale('zh-cn')

function get_info(callback) {
  chrome.storage.sync.get(
    {
      apiUrl: '',
      apiTokens: '',
      hidetag: '',
      showtag: '',
      memo_lock: '',
      open_action: '',
      open_content: '',
      userid: '',
      resourceIdList: [],
      habitica_user_id: '',
      habitica_api_key: '',
      kanban_url: '',
      obsidian_url: '',
      debug_mode: false,
      forward_all_mode: false,
      webhook_url: ''
    },
    function (items) {
      var flag = false
      var returnObject = {}
      if (items.apiUrl === '') {
        flag = false
      } else {
        flag = true
      }
      returnObject.status = flag
      returnObject.apiUrl = items.apiUrl || ''
      returnObject.apiTokens = items.apiTokens || ''
      returnObject.hidetag = items.hidetag || ''
      returnObject.showtag = items.showtag || ''
      returnObject.memo_lock = items.memo_lock || ''
      returnObject.open_content = items.open_content || ''
      returnObject.open_action = items.open_action || ''
      returnObject.userid = items.userid || ''
      returnObject.resourceIdList = items.resourceIdList || []
      returnObject.habitica_user_id = items.habitica_user_id || ''
      returnObject.habitica_api_key = items.habitica_api_key || ''
      returnObject.kanban_url = items.kanban_url || ''
      returnObject.obsidian_url = items.obsidian_url || ''
      returnObject.debug_mode = items.debug_mode || false
      returnObject.forward_all_mode = items.forward_all_mode || false
      returnObject.webhook_url = items.webhook_url || ''

      if (callback) callback(returnObject)
    }
  )
}

get_info(function (info) {
  if (info.status) {
    //已经有绑定信息了，折叠
    $('#blog_info').hide()
  }
  var memoNow = info.memo_lock
  if (memoNow == '') {
    chrome.storage.sync.set(
      { memo_lock: 'PUBLIC' }
    )
    $("#lock-now").text(chrome.i18n.getMessage("lockPublic"))
  }
  if (memoNow == "PUBLIC") {
    $("#lock-now").text(chrome.i18n.getMessage("lockPublic"))
  } else if (memoNow == "PRIVATE") {
    $("#lock-now").text(chrome.i18n.getMessage("lockPrivate"))
  } else if (memoNow == "PROTECTED") {
    $("#lock-now").text(chrome.i18n.getMessage("lockProtected"))
  }
  $('#apiUrl').val(info.apiUrl)
  $('#apiTokens').val(info.apiTokens)
  $('#hideInput').val(info.hidetag)
  $('#showInput').val(info.showtag)
  $('#habitica_user_id').val(info.habitica_user_id)
  $('#habitica_api_key').val(info.habitica_api_key)
  $('#kanban_url').val(info.kanban_url)
  $('#obsidian_url').val(info.obsidian_url)
  $('#debug_mode').prop('checked', info.debug_mode)
  $('#forward_all_mode').prop('checked', info.forward_all_mode)
  $('#webhook_url').val(info.webhook_url)

  if (info.debug_mode) {
    $('#content_debug_text').show()
    if (info.webhook_url === '') {
      $('#content_debug_text').attr('disabled', 'disabled')
    } else {
      $('#content_debug_text').removeAttr('disabled')
    }
  } else {
    $('#content_debug_text').hide()
  }
  if (info.open_action === 'upload_image') {
    //打开的时候就是上传图片
    uploadImage(info.open_content)
  } else {
    $("textarea[name=text]").val(info.open_content)
  }
  //从localstorage 里面读取数据
  setTimeout(get_info, 1)
})

$("textarea[name=text]").focus()

//监听输入结束，保存未发送内容到本地
$("textarea[name=text]").blur(function () {
  chrome.storage.sync.set(
    { open_action: 'save_text', open_content: $("textarea[name=text]").val() }
  )
})

$("textarea[name=text]").on('keydown', function (ev) {
  if (ev.code === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
    $('#content_submit_text').click()
  }
})

//监听拖拽事件，实现拖拽到窗口上传图片
initDrag()

//监听复制粘贴事件，实现粘贴上传图片
document.addEventListener('paste', function (e) {
  let photo = null
  if (e.clipboardData.files[0]) {
    photo = e.clipboardData.files[0]
  } else if (e.clipboardData.items[0] && e.clipboardData.items[0].getAsFile()) {
    photo = e.clipboardData.items[0].getAsFile()
  }

  if (photo != null) {
    uploadImage(photo)
  }
})

function initDrag() {
  var file = null
  var obj = $("textarea[name=text]")[0]
  obj.ondragenter = function (ev) {
    if (ev.target.className === 'common-editor-inputer') {
      $.message({
        message: chrome.i18n.getMessage("picDrag"),
        autoClose: false
      })
      $('body').css('opacity', 0.3)
    }
    ev.dataTransfer.dropEffect = 'copy'
  }
  obj.ondragover = function (ev) {
    ev.preventDefault()
    ev.dataTransfer.dropEffect = 'copy'
  }
  obj.ondrop = function (ev) {
    $('body').css('opacity', 1)
    ev.preventDefault()
    var files = ev.dataTransfer.files || ev.target.files
    for (var i = 0; i < files.length; i++) {
      file = files[i]
    }
    uploadImage(file)
  }
  obj.ondragleave = function (ev) {
    ev.preventDefault()
    if (ev.target.className === 'common-editor-inputer') {
      $.message({
        message: chrome.i18n.getMessage("picCancelDrag")
      })
      $('body').css('opacity', 1)
    }
  }
}

let relistNow = []
function uploadImage(file) {
  $.message({
    message: chrome.i18n.getMessage("picUploading"),
    autoClose: false
  });
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64String = e.target.result.split(',')[1];
    uploadImageNow(base64String, file);
  };
  reader.onerror = function (error) {
    console.error('Error reading file:', error);
  };
  reader.readAsDataURL(file);
};

function uploadImageNow(base64String, file) {
  get_info(function (info) {
    if (info.status) {
      let old_name = file.name.split('.');
      let file_ext = file.name.split('.').pop();
      let now = dayjs().format('YYYYMMDDHHmmss');
      let new_name = old_name[0] + '_' + now + '.' + file_ext;
      var hideTag = info.hidetag
      var showTag = info.showtag
      var nowTag = $("textarea[name=text]").val().match(/(#[^\s#]+)/)
      var sendvisi = info.memo_lock || ''
      if (nowTag) {
        if (nowTag[1] == showTag) {
          sendvisi = 'PUBLIC'
        } else if (nowTag[1] == hideTag) {
          sendvisi = 'PRIVATE'
        }
      }
      const data = {
        content: base64String,
        visibility: sendvisi,
        filename: new_name,
        type: file.type
      };
      var sendAjaxUrl = info.apiUrl + 'api/v1/resources';
      if (info.forward_all_mode && info.webhook_url) {
        sendAjaxUrl = info.webhook_url;
      }
      $.ajax({
        url: sendAjaxUrl,
        data: JSON.stringify(data),
        type: 'post',
        cache: false,
        processData: false,
        contentType: 'application/json',
        dataType: 'json',
        headers: { 'Authorization': 'Bearer ' + info.apiTokens },
        success: function (data) {
          // 0.24 版本+ 返回体uid已合并到name字段
          if (data.name) {
            // 更新上传的文件信息并暂存浏览器本地
            relistNow.push({
              "name": data.name,
              "createTime": data.createTime,
              "type": data.type
            })
            chrome.storage.sync.set(
              {
                open_action: '',
                open_content: '',
                resourceIdList: relistNow
              },
              function () {
                $.message({
                  message: chrome.i18n.getMessage("picSuccess")
                })
              }
            )
          } else {
            //发送失败 清空open_action（打开时候进行的操作）,同时清空open_content
            chrome.storage.sync.set(
              {
                open_action: '',
                open_content: '',
                resourceIdList: []
              },
              function () {
                $.message({
                  message: chrome.i18n.getMessage("picFailed")
                })
              }
            )
          }
        }
      });
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  });
}

$('#saveKey').click(function () {
  var apiUrl = $('#apiUrl').val()
  if (apiUrl.length > 0 && !apiUrl.endsWith('/')) {
    apiUrl += '/';
  }
  var apiTokens = $('#apiTokens').val()
  // 设置请求参数
  const settings = {
    async: true,
    crossDomain: true,
    url: apiUrl + 'api/v1/auth/status',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiTokens
    }
  };

  $.ajax(settings).done(function (response) {
    // 0.24 版本后无 id 字段，改为从 name 字段获取和判断认证是否成功
    if (response && response.name) {
      // 如果响应包含用户name "users/{id}"，存储 apiUrl 和 apiTokens
      var userid = parseInt(response.name.split('/').pop(), 10)
      chrome.storage.sync.set(
        {
          apiUrl: apiUrl,
          apiTokens: apiTokens,
          userid: userid
        },
        function () {
          $.message({
            message: chrome.i18n.getMessage("saveSuccess")
          });
          $('#blog_info').hide();
        }
      );
    } else {
      // 如果响应不包含用户 ID，显示错误消息
      $.message({
        message: chrome.i18n.getMessage("invalidToken")
      });
    }
  }).fail(function () {
    // 请求失败时显示错误消息
    $.message({
      message: chrome.i18n.getMessage("invalidToken")
    });
  });
});

$('#opensite').click(function () {
  get_info(function (info) {
    chrome.tabs.create({ url: info.apiUrl })
  })
})

// 0.23.1版本 GET api/v1/{parent}/tags 接口已移除，参考 https://github.com/usememos/memos/issues/4161 
$('#tags').click(function () {
  get_info(function (info) {
    if (info.apiUrl) {
      var parent = `users/${info.userid}`;
      // 从最近的1000条memo中获取tags,因此不保证获取能全部的
      var tagUrl = info.apiUrl + 'api/v1/' + parent + '/memos?pageSize=1000';
      var tagDom = "";
      $.ajax({
        url: tagUrl,
        type: "GET",
        contentType: "application/json",
        dataType: "json",
        headers: { 'Authorization': 'Bearer ' + info.apiTokens },
        success: function (data) {
          // 提前并去重所有标签
          const allTags = data.memos.flatMap(memo => memo.tags);
          const uniTags = [...new Set(allTags)];
          $.each(uniTags, function (_, tag) {
            tagDom += '<span class="item-container">#' + tag + '</span>';
          });
          tagDom += '<svg id="hideTag" class="hidetag" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M78.807 362.435c201.539 314.275 666.962 314.188 868.398-.241 16.056-24.99 13.143-54.241-4.04-62.54-17.244-8.377-40.504 3.854-54.077 24.887-174.484 272.338-577.633 272.41-752.19.195-13.573-21.043-36.874-33.213-54.113-24.837-17.177 8.294-20.06 37.545-3.978 62.536z" fill="#fff"/><path d="M894.72 612.67L787.978 494.386l38.554-34.785 106.742 118.251-38.554 34.816zM635.505 727.51l-49.04-147.123 49.255-16.41 49.054 147.098-49.27 16.435zm-236.18-12.001l-49.568-15.488 43.29-138.48 49.557 15.513-43.28 138.455zM154.49 601.006l-38.743-34.565 95.186-106.732 38.763 34.566-95.206 106.731z" fill="#fff"/></svg>'
          $("#taglist").html(tagDom).slideToggle(500)
        }
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
})

$(document).on("click", "#hideTag", function () {
  $('#taghide').slideToggle(500)
})

$('#saveTag').click(function () {
  // 保存数据
  chrome.storage.sync.set(
    {
      hidetag: $('#hideInput').val(),
      showtag: $('#showInput').val()
    },
    function () {
      $.message({
        message: chrome.i18n.getMessage("saveSuccess")
      })
      $('#taghide').hide()
    }
  )
})

$('#lock').click(function () {
  $("#lock-wrapper").toggleClass("!hidden", 1000);
})

$(document).on("click", ".item-lock", function () {
  $("#lock-wrapper").toggleClass("!hidden", 1000);
  $("#lock-now").text($(this).text())
  _this = $(this)[0].dataset.type;
  chrome.storage.sync.set(
    { memo_lock: _this }
  )
})

$('#search').click(function () {
  get_info(function (info) {
    const pattern = $("textarea[name=text]").val()
    var parent = `users/${info.userid}`;
    var filter = "?filter=" + encodeURIComponent(`visibility in ["PUBLIC","PROTECTED"] && content.contains("${pattern}")`);
    if (info.status) {
      $("#randomlist").html('').hide()
      var searchDom = ""
      if (pattern) {
        $.ajax({
          url: info.apiUrl + "api/v1/" + parent + "/memos" + filter,
          type: "GET",
          contentType: "application/json",
          dataType: "json",
          headers: { 'Authorization': 'Bearer ' + info.apiTokens },
          success: function (data) {
            let searchData = data.memos
            if (searchData.length == 0) {
              $.message({
                message: chrome.i18n.getMessage("searchNone")
              })
            } else {
              for (var i = 0; i < searchData.length; i++) {
                var memosID = searchData[i].name.split('/').pop();
                searchDom += '<div class="random-item"><div class="random-time"><span id="random-link" data-uid="' + memosID + '"><svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M864 640a32 32 0 0 1 64 0v224.096A63.936 63.936 0 0 1 864.096 928H159.904A63.936 63.936 0 0 1 96 864.096V159.904C96 124.608 124.64 96 159.904 96H384a32 32 0 0 1 0 64H192.064A31.904 31.904 0 0 0 160 192.064v639.872A31.904 31.904 0 0 0 192.064 864h639.872A31.904 31.904 0 0 0 864 831.936V640zm-485.184 52.48a31.84 31.84 0 0 1-45.12-.128 31.808 31.808 0 0 1-.128-45.12L815.04 166.048l-176.128.736a31.392 31.392 0 0 1-31.584-31.744 32.32 32.32 0 0 1 31.84-32l255.232-1.056a31.36 31.36 0 0 1 31.584 31.584L924.928 388.8a32.32 32.32 0 0 1-32 31.84 31.392 31.392 0 0 1-31.712-31.584l.736-179.392L378.816 692.48z" fill="#666" data-spm-anchor-id="a313x.7781069.0.i12" class="selected"/></svg></span><span id="random-delete" data-name="' + searchData[i].name + '" data-uid="' + memosID + '"><svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M224 322.6h576c16.6 0 30-13.4 30-30s-13.4-30-30-30H224c-16.6 0-30 13.4-30 30 0 16.5 13.5 30 30 30zm66.1-144.2h443.8c16.6 0 30-13.4 30-30s-13.4-30-30-30H290.1c-16.6 0-30 13.4-30 30s13.4 30 30 30zm339.5 435.5H394.4c-16.6 0-30 13.4-30 30s13.4 30 30 30h235.2c16.6 0 30-13.4 30-30s-13.4-30-30-30z" fill="#666"/><path d="M850.3 403.9H173.7c-33 0-60 27-60 60v360c0 33 27 60 60 60h676.6c33 0 60-27 60-60v-360c0-33-27-60-60-60zm-.1 419.8l-.1.1H173.9l-.1-.1V464l.1-.1h676.2l.1.1v359.7z" fill="#666"/></svg></span>' + dayjs(searchData.createTime).fromNow() + '</div><div class="random-content">' + searchData[i].content.replace(/!\[.*?\]\((.*?)\)/g, ' <img class="random-image" src="$1"/> ').replace(/\[(.*?)\]\((.*?)\)/g, ' <a href="$2" target="_blank">$1</a> ') + '</div>'
                if (searchData[i].resources && searchData[i].resources.length > 0) {
                  var resources = searchData[i].resources;
                  for (var j = 0; j < resources.length; j++) {
                    var restype = resources[j].type.slice(0, 5);
                    var resexlink = resources[j].externalLink
                    var resLink = '', fileId = ''
                    if (resexlink) {
                      resLink = resexlink
                    } else {
                      fileId = resources[j].publicId || resources[j].filename
                      resLink = info.apiUrl + 'file/' + resources[j].name + '/' + fileId
                    }
                    if (restype == 'image') {
                      searchDom += '<img class="random-image" src="' + resLink + '"/>'
                    }
                    if (restype !== 'image') {
                      searchDom += '<a target="_blank" rel="noreferrer" href="' + resLink + '">' + resources[j].filename + '</a>'
                    }
                  }
                }
                searchDom += '</div>'
              }
              window.ViewImage && ViewImage.init('.random-image')
              $("#randomlist").html(searchDom).slideDown(500);
            }
          }
        });
      } else {
        $.message({
          message: chrome.i18n.getMessage("searchNow")
        })
      }
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
})

$('#random').click(function () {
  get_info(function (info) {
    var parent = `users/${info.userid}`;
    var filter = "?filter=" + encodeURIComponent(`visibility in ["PUBLIC","PROTECTED"]`);
    if (info.status) {
      $("#randomlist").html('').hide()
      var randomUrl = info.apiUrl + "api/v1/" + parent + "/memos" + filter;
      $.ajax({
        url: randomUrl,
        type: "GET",
        contentType: "application/json",
        dataType: "json",
        headers: { 'Authorization': 'Bearer ' + info.apiTokens },
        success: function (data) {
          let randomNum = Math.floor(Math.random() * (data.memos.length));
          var randomData = data.memos[randomNum]
          randDom(randomData)
        }
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
})

function randDom(randomData) {
  get_info(function (info) {
    var memosID = randomData.name.split('/').pop();
    var randomDom = '<div class="random-item"><div class="random-time"><span id="random-link" data-uid="' + memosID + '"><svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M864 640a32 32 0 0 1 64 0v224.096A63.936 63.936 0 0 1 864.096 928H159.904A63.936 63.936 0 0 1 96 864.096V159.904C96 124.608 124.64 96 159.904 96H384a32 32 0 0 1 0 64H192.064A31.904 31.904 0 0 0 160 192.064v639.872A31.904 31.904 0 0 0 192.064 864h639.872A31.904 31.904 0 0 0 864 831.936V640zm-485.184 52.48a31.84 31.84 0 0 1-45.12-.128 31.808 31.808 0 0 1-.128-45.12L815.04 166.048l-176.128.736a31.392 31.392 0 0 1-31.584-31.744 32.32 32.32 0 0 1 31.84-32l255.232-1.056a31.36 31.36 0 0 1 31.584 31.584L924.928 388.8a32.32 32.32 0 0 1-32 31.84 31.392 31.392 0 0 1-31.712-31.584l.736-179.392L378.816 692.48z" fill="#666" data-spm-anchor-id="a313x.7781069.0.i12" class="selected"/></svg></span><span id="random-delete" data-uid="' + memosID + '" data-name="' + randomData.name + '"><svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M224 322.6h576c16.6 0 30-13.4 30-30s-13.4-30-30-30H224c-16.6 0-30 13.4-30 30 0 16.5 13.5 30 30 30zm66.1-144.2h443.8c16.6 0 30-13.4 30-30s-13.4-30-30-30H290.1c-16.6 0-30 13.4-30 30s13.4 30 30 30zm339.5 435.5H394.4c-16.6 0-30 13.4-30 30s13.4 30 30 30h235.2c16.6 0 30-13.4 30-30s-13.4-30-30-30z" fill="#666"/><path d="M850.3 403.9H173.7c-33 0-60 27-60 60v360c0 33 27 60 60 60h676.6c33 0 60-27 60-60v-360c0-33-27-60-60-60zm-.1 419.8l-.1.1H173.9l-.1-.1V464l.1-.1h676.2l.1.1v359.7z" fill="#666"/></svg></span>' + dayjs(randomData.createTime).fromNow() + '</div><div class="random-content">' + randomData.content.replace(/!\[.*?\]\((.*?)\)/g, ' <img class="random-image" src="$1"/> ').replace(/\[(.*?)\]\((.*?)\)/g, ' <a href="$2" target="_blank">$1</a> ') + '</div>'
    if (randomData.resources && randomData.resources.length > 0) {
      var resources = randomData.resources;
      for (var j = 0; j < resources.length; j++) {
        var restype = resources[j].type.slice(0, 5);
        var resexlink = resources[j].externalLink
        var resLink = '', fileId = ''
        if (resexlink) {
          resLink = resexlink
        } else {
          fileId = resources[j].publicId || resources[j].filename
          resLink = info.apiUrl + 'file/' + resources[j].name + '/' + fileId
        }
        if (restype == 'image') {
          randomDom += '<img class="random-image" src="' + resLink + '"/>'
        }
        if (restype !== 'image') {
          randomDom += '<a target="_blank" rel="noreferrer" href="' + resLink + '">' + resources[j].filename + '</a>'
        }
      }
    }
    randomDom += '</div>'
    window.ViewImage && ViewImage.init('.random-image')
    $("#randomlist").html(randomDom).slideDown(500);
  })
}

$(document).on("click", "#random-link", function () {
  var memoUid = $("#random-link").data('uid');
  get_info(function (info) {
    chrome.tabs.create({ url: info.apiUrl + "m/" + memoUid })
  })
})

$(document).on("click", "#random-delete", function () {
  get_info(function (info) {
    // var memoUid = $("#random-delete").data('uid');
    var memosName = $("#random-delete").data('name');
    var deleteUrl = info.apiUrl + 'api/v1/' + memosName
    $.ajax({
      url: deleteUrl,
      type: "PATCH",
      data: JSON.stringify({
        // 'uid': memoUid,
        'state': "ARCHIVED"
      }),
      contentType: "application/json",
      dataType: "json",
      headers: { 'Authorization': 'Bearer ' + info.apiTokens },
      success: function (result) {
        $("#randomlist").html('').hide()
        $.message({
          message: chrome.i18n.getMessage("archiveSuccess")
        })
      }, error: function (err) {//清空open_action（打开时候进行的操作）,同时清空open_content
        $.message({
          message: chrome.i18n.getMessage("archiveFailed")
        })
      }
    })
  })
})

$(document).on("click", ".item-container", function () {
  var tagHtml = $(this).text() + " "
  add(tagHtml);
})

$('#newtodo').click(function () {
  var tagHtml = "\n- [ ] "
  add(tagHtml);
})

$('#getlink').click(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    // var linkHtml = " ["+tab.title+"]("+tab.url+") "
    var linkHtml = " [" + tab.title + "](" + getCleanUrl(tab.url) + ") "
    console.log("liguoqinjim linkHtml", linkHtml);
    if (tab.url) {
      add(linkHtml);
    } else {
      $.message({
        message: chrome.i18n.getMessage("getTabFailed")
      })
    }
  })
})

$('#upres').click(async function () {
  $('#inFile').click()
})

$('#inFile').on('change', function (data) {
  var fileVal = $('#inFile').val();
  var file = null
  if (fileVal == '') {
    return;
  }
  file = this.files[0];
  uploadImage(file)
});

function add(str) {
  var tc = document.getElementById("content");
  var tclen = tc.value.length;
  tc.focus();
  if (typeof document.selection != "undefined") {
    document.selection.createRange().text = str;
  } else {
    tc.value =
      tc.value.substr(0, tc.selectionStart) +
      str +
      tc.value.substring(tc.selectionStart, tclen);
  }
}

$('#blog_info_edit').click(function () {
  $('#blog_info').slideToggle()
})

$('#content_submit_text').click(function () {
  var contentVal = $("textarea[name=text]").val()
  if (contentVal) {
    sendText()
  } else {
    $.message({
      message: chrome.i18n.getMessage("placeContent")
    })
  }
})

function getOne(memosId) {
  get_info(function (info) {
    if (info.apiUrl) {
      $("#randomlist").html('').hide()
      var getUrl = info.apiUrl + 'api/v1/' + memosId
      $.ajax({
        url: getUrl,
        type: "GET",
        contentType: "application/json",
        dataType: "json",
        headers: { 'Authorization': 'Bearer ' + info.apiTokens },
        success: function (data) {
          randDom(data)
        }
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
}

function sendText() {
  get_info(function (info) {
    if (info.status) {
      $.message({
        message: chrome.i18n.getMessage("memoUploading")
      })
      //$("#content_submit_text").attr('disabled','disabled');
      let content = $("textarea[name=text]").val()

      // Append metadata if available
      if (window.currentMetadata) {
        const metadataJSON = window.MetadataExtractor.getMetadataJSON(window.currentMetadata);
        content = content + '\n---METADATA---\n' + metadataJSON;
      }

      var hideTag = info.hidetag
      var showTag = info.showtag
      var nowTag = $("textarea[name=text]").val().match(/(#[^\s#]+)/)
      var sendvisi = info.memo_lock || ''
      if (nowTag) {
        if (nowTag[1] == showTag) {
          sendvisi = 'PUBLIC'
        } else if (nowTag[1] == hideTag) {
          sendvisi = 'PRIVATE'
        }
      }
      $.ajax({
        url: (info.forward_all_mode && info.webhook_url) ? info.webhook_url : info.apiUrl + 'api/v1/memos',
        type: "POST",
        data: JSON.stringify({
          'content': content,
          'visibility': sendvisi
        }),
        contentType: "application/json",
        dataType: "json",
        headers: { 'Authorization': 'Bearer ' + info.apiTokens },
        success: function (data) {
          if (info.resourceIdList.length > 0) {
            //匹配图片
            $.ajax({
              url: info.apiUrl + 'api/v1/' + data.name,
              type: "PATCH",
              data: JSON.stringify({
                'resources': info.resourceIdList || [],
              }),
              contentType: "application/json",
              dataType: "json",
              headers: { 'Authorization': 'Bearer ' + info.apiTokens },
              success: function (res) {
                getOne(data.name)
              }
            })
          } else {
            getOne(data.name)
          }
          chrome.storage.sync.set(
            { open_action: '', open_content: '', resourceIdList: [] },
            function () {
              $.message({
                message: chrome.i18n.getMessage("memoSuccess")
              })
              //$("#content_submit_text").removeAttr('disabled');
              $("textarea[name=text]").val('')
            }
          )
        }, error: function (err) {//清空open_action（打开时候进行的操作）,同时清空open_content
          chrome.storage.sync.set(
            { open_action: '', open_content: '', resourceIdList: [] },
            function () {
              $.message({
                message: chrome.i18n.getMessage("memoFailed")
              })
            }
          )
        },
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
}

// Habitica
$('#saveHabitica').click(function () {
  // 保存 Habitica 信息
  chrome.storage.sync.set(
    {
      habitica_user_id: $('#habitica_user_id').val(),
      habitica_api_key: $('#habitica_api_key').val()
    },
    function () {
      $.message({
        message: chrome.i18n.getMessage("saveHabiticaSuccess")
      });
      $('#blog_info').hide();
    }
  )
});

$('#saveKanban').click(function () {
  // 保存 Kanban 信息
  chrome.storage.sync.set(
    {
      kanban_url: $('#kanban_url').val()
    },
    function () {
      $.message({
        message: chrome.i18n.getMessage("saveKanbanSuccess")
      });
      $('#blog_info').hide();
    }
  )
});

$('#saveObsidian').click(function () {
  // 保存 Obsidian 信息
  chrome.storage.sync.set(
    {
      obsidian_url: $('#obsidian_url').val()
    },
    function () {
      $.message({
        message: "保存 Obsidian 配置成功"
      });
      $('#blog_info').hide();
    }
  )
});

$('#exportConfig').click(function () {
  get_info(function (info) {
    const config = {
      apiUrl: info.apiUrl,
      apiTokens: info.apiTokens,
      hidetag: info.hidetag,
      showtag: info.showtag,
      memo_lock: info.memo_lock,
      habitica_user_id: info.habitica_user_id,
      habitica_api_key: info.habitica_api_key,
      kanban_url: info.kanban_url,
      obsidian_url: info.obsidian_url,
      debug_mode: info.debug_mode,
      webhook_url: info.webhook_url
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memos_config_${dayjs().format('YYYYMMDD')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    $.message({ message: "配置已导出" });
  });
});

$('#importConfig').click(function () {
  $('#importFileInput').click();
});

$('#importFileInput').change(function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const config = JSON.parse(e.target.result);
      chrome.storage.sync.set(config, function () {
        $.message({ message: "配置导入成功，请重新打开插件生效" });
        setTimeout(() => window.location.reload(), 1500);
      });
    } catch (err) {
      $.message({ message: "无效的配置文件" });
    }
  };
  reader.readAsText(file);
});

$('#saveDebug').click(function () {
  // 保存 调试 信息
  chrome.storage.sync.set(
    {
      debug_mode: $('#debug_mode').is(':checked'),
      forward_all_mode: $('#forward_all_mode').is(':checked'),
      webhook_url: $('#webhook_url').val()
    },
    function () {
      $.message({
        message: "保存调试信息成功"
      });
      $('#blog_info').hide();

      // 更新按钮状态
      get_info(function (info) {
        if (info.debug_mode) {
          $('#content_debug_text').show()
          if (info.webhook_url === '') {
            $('#content_debug_text').attr('disabled', 'disabled')
          } else {
            $('#content_debug_text').removeAttr('disabled')
          }
        } else {
          $('#content_debug_text').hide()
        }
      })
    }
  )
});

$('#content_debug_text').click(function () {
  var contentVal = $("textarea[name=text]").val()
  if (contentVal) {
    createDebugTask()
  } else {
    $.message({
      message: chrome.i18n.getMessage("placeContent")
    })
  }
})

function createDebugTask() {
  get_info(function (info) {
    if (info.webhook_url) {
      $.message({
        message: "发送至 Webhook 中……"
      })
      let content = $("textarea[name=text]").val()

      // Append metadata if available
      if (window.currentMetadata) {
        const metadataJSON = window.MetadataExtractor.getMetadataJSON(window.currentMetadata);
        content = content + '\n---METADATA---\n' + metadataJSON;
      }

      $.ajax({
        url: info.webhook_url,
        type: "POST",
        data: JSON.stringify({
          'content': content,
          'metadata': window.currentMetadata || null,
          'timestamp': new Date().toISOString()
        }),
        contentType: "application/json",
        dataType: "json",
        success: function (data) {
          $.message({
            message: "调试发送成功！😊"
          })
        }, error: function (err) {
          console.log("createDebugTask error", err)
          $.message({
            message: "调试发送失败: " + JSON.stringify(err)
          })
        },
      })
    } else {
      $.message({
        message: "请配置 Webhook URL"
      })
    }
  })
}

$('#content_habitica_text').click(function () {
  var contentVal = $("textarea[name=text]").val()
  if (contentVal) {
    createHabiticaTask()
  } else {
    $.message({
      message: chrome.i18n.getMessage("placeContent")
    })
  }
})

$('#content_ob_text').click(function () {
  var contentVal = $("textarea[name=text]").val()
  if (contentVal) {
    createObsidianTask()
  } else {
    $.message({
      message: chrome.i18n.getMessage("placeContent")
    })
  }
})

$('#content_kanban_text').click(function () {
  var contentVal = $("textarea[name=text]").val()
  if (contentVal) {
    createKanbanTask()
  } else {
    $.message({
      message: chrome.i18n.getMessage("placeContent")
    })
  }
})

function createHabiticaTask() {
  get_info(function (info) {
    if (info.status) {
      $.message({
        message: chrome.i18n.getMessage("memoHabiticaUploading")
      })

      let content = $("textarea[name=text]").val()

      // Use stored metadata if available
      let title = "";
      let url = "";
      let author = "";
      let duration = "";

      if (window.currentMetadata) {
        // Use new metadata format
        const metadata = window.currentMetadata;
        title = getCleanTitle(metadata.title, metadata.url, true);
        url = metadata.url || "";
        author = metadata.author || "";
        duration = metadata.duration || "";
      } else {
        // Fallback: parse from content (legacy support)
        content = content.replace(/\//g, ',')
        let regex = /\[(.*?)\]\(.*?\)/;
        let match = content.match(regex);
        title = match ? match[1] : '';
        let urlRegex = /\[(.*?)\]\((.*?)\)/;
        let urlMatch = content.match(urlRegex);
        url = urlMatch ? urlMatch[2] : '';

        title = getCleanTitle(title, url);
        url = getCleanUrl(url);
      }

      // Build task title as markdown link
      const taskTitle = "[" + title + "]" + "(" + url + ")";

      let habitica_url = "https://habitica.com/api/v3/tasks/user"
      if (info.forward_all_mode && info.webhook_url) {
        habitica_url = info.webhook_url
      }
      let data = {
        'text': taskTitle,
        'type': 'todo',
        'checklist': [
          { 'text': "ANKI" },
          { 'text': "OB笔记-score" }
        ],
        'priority': 1.5,
      }
      if (duration !== "") {
        data['notes'] = "[](完成时间-" + duration + ")"
      }

      $.ajax({
        url: habitica_url,
        type: "POST",
        data: JSON.stringify(data),
        contentType: "application/json",
        dataType: "json",
        headers: {
          'x-client': 'memos-bber',
          'x-api-user': info.habitica_user_id,
          'x-api-key': info.habitica_api_key
        },
        success: function (data) {
          $.message({
            message: chrome.i18n.getMessage("memoSuccess")
          })
        }, error: function (err) {
          console.log("createHabiticaTask error", err)
          $.message({
            message: "创建 Habitica 任务失败: " + JSON.stringify(err)
          })
        },
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
}

function createObsidianTask() {
  get_info(function (info) {
    if (info.status) {
      $.message({
        message: chrome.i18n.getMessage("memoHabiticaUploading")
      })

      let content = $("textarea[name=text]").val()

      // Use stored metadata if available
      let title = "";
      let url = "";
      let author = "";

      if (window.currentMetadata) {
        const metadata = window.currentMetadata;
        title = getCleanTitle(metadata.title, metadata.url, true);
        url = metadata.url || "";
        author = metadata.author || "";
      } else {
        // Fallback: parse from content (legacy support)
        content = content.replace(/\//g, ',')
        let regex = /\[(.*?)\]\(.*?\)/;
        let match = content.match(regex);
        title = match ? match[1] : '';
        let urlRegex = /\[(.*?)\]\((.*?)\)/;
        let urlMatch = content.match(urlRegex);
        url = urlMatch ? urlMatch[2] : '';

        title = getCleanTitle(title, url);
        url = getCleanUrl(url);
      }

      let obsidian_url = info.obsidian_url || "https://n8n.liguoqinjim.cn/webhook/cfda0c03-5f6a-40d9-8d09-303c9eada2e3"
      if (info.forward_all_mode && info.webhook_url) {
        obsidian_url = info.webhook_url
      }
      $.ajax({
        url: obsidian_url,
        type: "POST",
        data: JSON.stringify({
          "note_title": title,
          "template_name": "知识点-视频",
          "target_dir": "900-待归类",
          "note_url": url,
          "author": author,
          "duration": window.currentMetadata?.duration || "",
          "create_date": window.currentMetadata?.createDate || "",
          "metadata": window.currentMetadata || null
        }),
        contentType: "application/json",
        dataType: "json",
        success: function (data) {
          if (data.result === 1) {
            // 如果返回是`笔记已存在: 绝对路径`，则解析出绝对路径并生成 Obsidian URL，提示是否在新标签页打开
            if (typeof data['data'] === "string" && data['data'].indexOf("笔记已存在") === 0) {
              // 1. 用分割，获取已存在文件的绝对路径
              // 示例返回：笔记已存在: /Users/li/Workspace/github.com/ObSpace/900-待归类/xxx.md
              const noteMsg = data['data'];
              const parts = noteMsg.split(": ");

              $.message({
                message: data['data']
              })
              if (parts.length >= 2) {
                const absPath = parts.slice(1).join(": ").trim();

                // 2. 把绝对路径转换为 Obsidian 的 URL
                // 绝对路径前缀（Obsidian vault 目录）
                const vaultRoot = "/Users/li/Workspace/github.com/ObSpace/";
                let relativePath = absPath;
                if (absPath.indexOf(vaultRoot) === 0) {
                  relativePath = absPath.substring(vaultRoot.length);
                }
                const obsidianUrl = "obsidian://open?vault=ObSpace&file=" + encodeURIComponent(relativePath);

                // 3. 弹出确认框，是否使用新标签页打开 Obsidian URL
                const shouldOpen = window.confirm("笔记已存在，是否在新标签页中打开对应的 Obsidian 笔记？");
                if (shouldOpen) {
                  chrome.tabs.create({
                    url: obsidianUrl,
                    active: true
                  });
                }
              }
            } else {
              $.message({
                message: data['data']
              })
            }
          } else {
            $.message({
              message: chrome.i18n.getMessage("memoSuccess")
            })
          }
        }, error: function (err) {//清空open_action（打开时候进行的操作）,同时清空open_content
          console.log("createObsidianTask error", err)
          $.message({
            // message: chrome.i18n.getMessage("memoFailed")
            message: "创建 Obsidian 任务失败: " + JSON.stringify(err)
          })
        },
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
}

function createKanbanTask() {
  get_info(function (info) {
    if (info.status) {
      $.message({
        message: chrome.i18n.getMessage("memoHabiticaUploading")
      })

      let content = $("textarea[name=text]").val()

      // Parse note from content (text after the markdown link)
      let note = "";
      let regex = /^\[([\s\S]*?)\]\(([^)]+)\)\s*([\s\S]*)$/;
      let match = content.trim().match(regex);
      if (match && match[3]) {
        note = match[3].trim().replace(/\//g, ',');
      }

      // Use stored metadata if available
      let title = "";
      let url = "";
      let author = "";
      let duration = "";

      if (window.currentMetadata) {
        const metadata = window.currentMetadata;
        title = getCleanTitle(metadata.title, metadata.url, true);
        url = metadata.url || "";
        author = metadata.author || "";
        duration = metadata.duration || "";
      } else {
        // Fallback: parse from content (legacy support)
        title = match ? match[1] : '';
        url = match ? match[2] : '';
        title = getCleanTitle(title, url);
      }

      // Build task title as markdown link with note
      const taskTitle = "[" + title + "]" + "(" + url + ")" + (note ? " " + note : "");

      let kanban_url = info.kanban_url || "https://n8n.liguoqinjim.cn/webhook/b49ba024-e9a9-42da-93cf-05d826993ba8"
      if (info.forward_all_mode && info.webhook_url) {
        kanban_url = info.webhook_url
      }
      $.ajax({
        url: kanban_url,
        type: "POST",
        data: JSON.stringify({
          'text': taskTitle,
          'checklist': [
            { 'text': "ANKI" },
            { 'text': "OB笔记-score" }
          ],
          'duration': duration,
          'url': url,
          "author": author,
          'note': note,
          'metadata': window.currentMetadata || null
        }),
        contentType: "application/json",
        dataType: "json",
        success: function (data) {
          $.message({
            message: chrome.i18n.getMessage("memoSuccess")
          })
        }, error: function (err) {
          console.log("createKanbanTask error", err)
          $.message({
            message: "创建 Kanban 任务失败: " + JSON.stringify(err)
          })
        },
      })
    } else {
      $.message({
        message: chrome.i18n.getMessage("placeApiUrl")
      })
    }
  })
}

// 清除url中的query参数
function getCleanUrl(url) {
  if (url.includes('bilibili.com')) {
    return url.split('?')[0];
  }
  return url;
}

function getCleanTitle(title, url, shouldTruncate = true) {
  // 特定网站处理
  if (url.includes('bbs.quantclass.cn')) {
    title = title.replace(' - 量化小论坛', '');
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    title = title.replace(' / X', '');
    // 去除所有http/https链接，包括短链接
    title = title.replace(/https?:\/\/\S+/gi, '');

    // 去除首尾的各种引号字符
    title = title.replace('：“', '：');

    // 清理多余的空格
    title = title.replace(/\s+/g, ' ').trim();

    // 设置最大长度，最多不超过20个中文字符
    if (shouldTruncate) {
      const MAX_TITLE_LENGTH = 38;
      const colonIndex = title.indexOf('：');
      if (colonIndex !== -1) {
        let prefix = title.substring(0, colonIndex + 1);
        // 如果 prefix是以`(数字) 开头，则去掉。使用正则表达式判断
        const regex = /^\(\d+\)\s+/;
        if (regex.test(prefix)) {
          prefix = prefix.replace(regex, '');
        }

        let suffix = title.substring(colonIndex + 1);
        // 去除suffix开头和结尾的引号（支持中英文引号）
        suffix = suffix.replace(/^[""]/, '').replace(/[“]$/, '').replace(/[”]$/, '');
        if (Array.from(suffix).length > MAX_TITLE_LENGTH) {
          title = prefix + Array.from(suffix).slice(0, MAX_TITLE_LENGTH).join('');
        }
      } else {
        if (Array.from(title).length > MAX_TITLE_LENGTH) {
          title = Array.from(title).slice(0, MAX_TITLE_LENGTH).join('');
        }
      }
    }
  } else if (url.includes('youtube.com')) {
    title = title.replace(' - YouTube', '');

    // 判断开头是否有这样的格式： “(1) 當年為什麼退出聯合國？”，去掉开头
    const regex = /^\(\d+\)\s/; // regex pattern to match "(1) " at the beginning of the title
    if (regex.test(title)) {
      title = title.replace(regex, '');
    }
  } else if (url.includes('bilibili.com')) {
    title = title.replace('_哔哩哔哩_bilibili', '');
  } else if (url.includes('github.com')) {
    // 判断url是否符合这个正则表达式：https://github.com/jaegertracing/jaeger
    const regex = /https:\/\/github.com\/[^\/]+\/[^\/]+$/;
    if (regex.test(url)) {
      // 从URL中提取仓库名
      const urlParts = url.split('/');
      const repoName = urlParts[urlParts.length - 1];
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
