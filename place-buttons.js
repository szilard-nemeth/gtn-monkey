console.log("Loaded place-buttons.js")

function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function createButton(title, funcToCall, imgSrc, imgAlt, style) {
    if (title === undefined || title == "") {
        throw "Title should be defined!"
    }

    if (funcToCall === undefined || funcToCall == "" || !isFunction(funcToCall)) {
    	throw "funcToCall should be a valid function!"
    }

    var id = title.toLowerCase().replace(/ /g, '-');
    var href = `javascript:${funcToCall.name}();`
    var anchorClass = "aui-button aui-button-subtle issuenav-share no-icon"

    var anchorDef = `<a id="${id}" class="${anchorClass}" href="${href}" title="${title}"
                    ${style != undefined ? `style="${style}"` : `style=""`}>${title}</a>`
    var anchor = myjQuery(anchorDef.trim())

    if (imgSrc) {
        var img = myjQuery(`<img src="${imgSrc}" alt="${imgAlt}" style="width:20px;height:20px"> </a>`.trim())
        img.appendTo(anchor)
    }

    console.log("anchor:", anchor)
    anchor.appendTo($('.saved-search-operations '));
}

var filterPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")
if (filterPage) {
    createButton("GTN Monkey!", findAllLinksFromJiraIssues, "http://localhost:8080/monkey-icon.png", "monkey-logo", "background-color: lightgreen")
    createButton("GTNM Show results", showResultsOverlay, "http://localhost:8080/monkey-icon.png", "monkey-logo")
    createButton("GTNM Clear results", cleanupStorage, "http://localhost:8080/monkey-icon.png", "monkey-logo", "background-color: lightcoral")
}
