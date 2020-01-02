function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function createButton(title, funcToCall, icon) {
    if (title === undefined || title == "") {
        throw "Title should be defined!"
    }

    if (funcToCall === undefined || funcToCall == "" || !isFunction(funcToCall)) {
    	throw "funcToCall should be a valid function!"
    }

    var href = `javascript:${funcToCall.name}();`
    var anchorClass = "aui-button aui-button-subtle issuenav-share no-icon"
    var anchor = myjQuery(`<a class="${anchorClass}" href="${href}" title="${title}">${title}</a>`.trim())
    console.log("anchor:", anchor)
    anchor.appendTo($('.saved-search-operations '));
}

var filterPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")
if (filterPage) {
    createButton("GTN Monkey!", findAllLinksFromJiraIssues)    
}
