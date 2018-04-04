function saveOptions(e) {
    const rule_set = document.querySelector("#rule_set").value;
    try {
        JSON.parse(rule_set);
    }catch (e) {
        alert("Invalid JSON: "+e);
    }
    browser.storage.sync.set({
        rule_set: rule_set
    });
    browser.runtime.reload();
    e.preventDefault();
}

function restoreOptions() {
    var gettingItem = browser.storage.sync.get('rule_set');
    gettingItem.then((res) => {
        if (res.rule_set !== undefined) {
            document.querySelector("#rule_set").value = res.rule_set;
        }
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);