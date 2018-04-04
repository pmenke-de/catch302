const valid_fields = new RegExp("(frameId|fromCache|ip|method|originUrl|parentFrameId|proxyInfo|redirectUrl|requestId|responseHeaders|statusCode|statusLine|tabId|timeStamp|type|url)");
const storage = {};

const debugOn = true;
function debug(message) {
    console.log(message);
}

function interpolate(text, props) {
    return text.replace(/\{(\w+)\}/g, function(match, expr) {
        if (!expr.match(valid_fields)) {
            if(debugOn) debug("Invalid expression field: " + key);
            return "";
        }
        return props[expr];
    });
}

function onBeforeRedirectHandler(rule) {
    return function (details) {
        if(debugOn) debug("Matched rule:" + JSON.stringify(rule));
        if(debugOn) debug("Request: " + JSON.stringify(details));
        if (rule.store_check !== undefined) {
            for(let key in rule.store_check) {
                if (!rule.store_check.hasOwnProperty(key)) continue;
                if (!key.match(valid_fields)) {
                    if(debugOn) debug("Invalid additional check field: " + key);
                    return;
                }
                const pattern = new RegExp(rule.store_check[key]);
                if (!details[key].toString().match(pattern)) {
                    if(debugOn) debug("Filtered by additional check '" + key + "' ~ '" + pattern + "'");
                    return;
                }
            }
        }

        if (rule.store_base !== undefined) {
            const tabId = details.tabId.toString();
            storage[tabId] = {};

            const restore_base = interpolate(rule.store_base, details);
            if(rule.store_patten !== undefined && rule.store_replace !== undefined) {
                storage[tabId]["url"] = restore_base.replace(new RegExp(rule.store_pattern), rule.store_replace);
            } else {
                storage[tabId]["url"] = restore_base;
            }

            if(rule.restore_check !== undefined) {
                storage[tabId]["restore_check"] = rule.restore_check;
            }

            if(debugOn) debug("Stored URL for tab " + tabId + " is now: " + storage[tabId].url);
        }
    }
}

function tabOnRemovedHandler(tabId) {
    //free memory
    delete storage[tabId.toString()];
}

function navOnCompleteHandler(details) {
    if (storage[details.tabId] !== undefined) {
        if (storage[details.tabId]["restore_check"] !== undefined) {
            const restore_check = storage[details.tabId]["restore_check"];
            const pattern = new RegExp(restore_check);
            if (!details.url.toString().match(pattern)) {
                if(debugOn) debug("Restore filtered by url check");
                return;
            }
        }

        browser.tabs.update(details.tabId, {url: storage[details.tabId.toString()]["url"]});
        //restore only once.
        delete storage[details.tabId.toString()];
    }
}

function init() {
    const rule_set_item = browser.storage.sync.get('rule_set');
    rule_set_item.then((res) => {
        if (res.rule_set !== undefined) {
            const rule_set = JSON.parse(res.rule_set);
            for(let index = 0; index < rule_set.length; index++) {
                const rule = rule_set[index];
                browser.webRequest.onBeforeRedirect.addListener(onBeforeRedirectHandler(rule), {urls: [rule.url]});
                browser.webNavigation.onCompleted.addListener(navOnCompleteHandler);
            }
            browser.tabs.onRemoved.addListener(tabOnRemovedHandler);
        }
    }).catch(reason => {
        if(debugOn) debug("Initialization Error: " + reason);
        setTimeout(browser.runtime.reload, 15000)
    });
}

init();
