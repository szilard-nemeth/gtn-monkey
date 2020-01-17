console.log("Loaded place-buttons.js")

import * as GtnMonkey from './gtn-monkey.mjs';

const server_url = "http://localhost:8080"

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
    var anchorClass = "aui-button aui-button-subtle issuenav-share no-icon"
    var anchorDef = `<a id="${id}" class="${anchorClass}" title="${title}"
                    ${style != undefined ? `style="${style}"` : `style=""`}>${title}</a>`
    var anchor = myjQuery(anchorDef.trim())

    if (imgSrc) {
        var img = myjQuery(`<img src="${imgSrc}" alt="${imgAlt}" style="width:20px;height:20px"> </a>`.trim())
        img.appendTo(anchor)
    }

    console.log("anchor:", anchor)
    anchor.appendTo(myjQuery('.saved-search-operations '));

    //Add event listener when <a> is added to the DOM
    document.querySelector('#' + id).addEventListener('click', funcToCall)
}

var filterPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")
if (filterPage) {
    createButton("GTN Monkey", GtnMonkey.findAllLinksFromJiraIssues, `${server_url}/monkey-icon.png`, "monkey-logo", "background-color: lightgreen")
    createButton("GTNM Show results", GtnMonkey.showResultsOverlay, `${server_url}/monkey-icon.png`, "monkey-logo")
    createButton("GTNM Clear results", GtnMonkey.cleanupStorage, `${server_url}/monkey-icon.png`, "monkey-logo", "background-color: lightcoral")
}
