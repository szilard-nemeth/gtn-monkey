console.log("Loaded gtn-monkey.js")

//STRING CONSTANTS
//==========================================

//Quanta specific constants
//==========================================
const QUANTA_URL_VPN_CHECK = "https://quanta.infra.cloudera.com"
const gtnPlaceholder = "$GTN$"
const quantaTemplate = `http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/${gtnPlaceholder}/QUASAR_ZIP_FOLDER/`
//URL example: http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/1681945/QUASAR_ZIP_FOLDER/QUASAR_TEST_LOGS.zip

const quantaTestLogsFilename = "QUASAR_TEST_LOGS.zip"
const quantaDiagBundleFilename = "QUASAR_DIAG_LOGS.zip"
const testLogsTemplate = quantaTemplate + quantaTestLogsFilename
const diagBundleTemplate = quantaTemplate + quantaDiagBundleFilename

const quantaUrlSplitAlong = "/s3/quanta/"
const urlFragmentTestLogs = "TEST_LOGS"
const urlFragmentDiagBundle = "DIAG_BUNDLE"


//JQuery constants
//==========================================
const attrDisabled = "disabled"

//GTN Monkey constants
//==========================================
const SERVER_URL = "http://localhost:8080"
const CORS_ANYWHERE_SERVER_URL = "http://localhost:8081"

const pageTitle = "GTN MONKEY"
const gtnQueryParam = "gtn="

//progress
const progressStarted = "Started"
const progressFinished = "Finished"

//elements
const quantaTestLogParagraphIdPrefix = "quantatestlog"
const quantaBundleParagraphIdPrefix = "quantabundle"

//custom buttons, dialogs, overlay, etc
const clearResultsButtonSelector = "#gtnm-clear-results"
const showResultsButtonSelector = "#gtnm-show-results"
const gtnMonkeyDialogId = "gtnmonkey-dialog"
const gtnMonkeyResultsTableBody = "gtnmonkey-results-tbody"
const gtnMonkeyResultsIssueRow = "issuerow"
const rowNumberClass = "rownumber"

//others
const colorLightGreen = "#76D7C4"
const colorGrey = "#BFC9CA"


//==========================================
//Jira-related / Jira-defined stuff: buttons, dialogs, elements
const JIRA_SERVER_URL = "https://jira.cloudera.com"
const JIRA_ISSUES_URL_FRAGMENT = "issues/?"
const JIRA_FILTERPAGE_URL_FRAGMENT "issues/?filter="

const overlayClass = "aui-blanket"

//These are 2 states for the "Show more comments" button: 
//Examples:
//1. When collapsed
//<a class="collapsed-comments" href="/browse/CDH-76879?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&amp;showAll=true">
//<span class="collapsed-comments-line"></span><span class="show-more-comments" data-collapsed-count="18">18 older comments</span></a>

//2. While Loading
//<span class="show-more-comments" data-collapsed-count="18">Loading...</span>
const showMoreCommentsButton = "show-more-comments"
const collapsedCommentsButton = "collapsed-comments"


const descriptionSelector = '#descriptionmodule p'
const commentSelector = '.twixi-wrap > .action-body'
const jiraSummarySelector = '#summary-val'
const jiraFilterNameSelector = '.search-title'
const jiraIssuesOnFilterPageSelector = '.results-panel .issuekey a'


//End of constants
//==========================================

class JiraData {
  constructor(id, title, links) {    
    this.id = id;
    this.title = title;

    if (links == null || links == undefined) {
    	links = []
    }

    this.links = links.reduce(function(map, link) {
		var gtn = link.split(gtnQueryParam)[1]

		//If we have anything after GTN number, drop it
		gtn = gtn.match(/^\d+/gi)
		
		if (gtn == undefined || gtn == null) {
			throw "GTN is not valid for link: " + link
		}
    	
    	map[gtn] = { 
    		quantaLink: link,
    		quantaTestLog: testLogsTemplate.replace(gtnPlaceholder, gtn),
    		quantaDiagBundle: diagBundleTemplate.replace(gtnPlaceholder, gtn),
    		quantaTestLogDownloadName: `${this.id}-${gtn}-${quantaTestLogsFilename}`,
    		quantaDiagBundleDownloadName: `${this.id}-${gtn}-${quantaDiagBundleFilename}`
    	}
    	return map;
	}.bind(this), new Map());
  }
}

//ENTRYPOINT: Start up the scraping process
function findAllLinksFromJiraIssues() {
	var originPage = window.location.href.startsWith(`${JIRA_SERVER_URL}/${JIRA_FILTERPAGE_URL_FRAGMENT}`)

	if (originPage && !isInProgress() && isFinished()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
	}

	storeProgress(progressStarted)
	storeOriginPage()
	
	var issues = storeFoundJiraIssues()
	if (!issues || issues.length == 0) {
		printLog("NO JIRA ISSUES FOUND IN CURRENT PAGE!")
		return
	}
	gotoNextPage(getFoundJiraIssuesFromStorage())
}

function onDocumentReady() {
	bindEventHandlers()
	setButtonStates()
	printLog("Executed document.ready() on page: " + window.location.href)

	if (isInProgress()) {
		var issues = getFoundJiraIssuesFromStorage()
		printLog("Retrieved jira issues from storage: " + issues)

		//double-check URL
		if (issues && issues.length > 0 && window.location.href === issues[0]) {
			parseGTNLinksFromPage(navigateToNextPageCallback)
		} else if (location == getOriginPageFromStorage() && isInProgress()) {
			//We got back to the origin page
			//Let's show final results: showResultsOverlay should be executed as progress is finished
			stopProgress()
			checkIfQuantaLinksAreAccessible()
		} else {
			console.error("window.location.href != issues[0]. current page: " + window.location.href + " issues[0]: " + issues[0])
		}
	}
}

function bindEventHandlers() {
	myjQuery(document).keyup(function(e) {
		//Hide overlay and dialog on pressing ESC
		if (e.keyCode === 27) {
			closeResultsOverlay()
		}
	});
}

function setButtonStates() {
	if (isFinished()) {
		enableButton(showResultsButtonSelector, true)
	} else {
		enableButton(showResultsButtonSelector, false)
	}
}

function enableButton(buttonSelector, enabled) {
	myjQuery(buttonSelector).attr(attrDisabled, !enabled);
}


function closeResultsOverlay() {
	myjQuery('#' + gtnMonkeyDialogId).hide();
	myjQuery('.' + overlayClass).hide();
}

function showResultsOverlay() {
	//Only show if "Show results" button is enabled
	if (myjQuery(showResultsButtonSelector).attr(attrDisabled) !== attrDisabled) {
		myjQuery('#' + gtnMonkeyDialogId).show();
		myjQuery('.' + overlayClass).show();
	}
}

function navigateToNextPageCallback() {
	addResultsToTable()
	var issues = getFoundJiraIssuesFromStorage()
	var parsedPage = issues.shift()
	printLog("Parsed GTN links from current page")
	//store modified jira issues array to localStorage so next execution of onDocumentReady() picks up next page
	storeFoundJiraIssues(issues)

	//Navigate to next page
	if (issues.length > 0) {
		gotoNextPage(issues)
	} else {
		printLog("No more pages to process. Changing location to origin jira URL: " + getOriginPageFromStorage())
		gotoOriginPage()
	}
}

function waitForCommentsLoaded(functionsToCall) {
	var waitForEl = function(selector, callbacks, count) {
		if (!count) {
			count = 0;
		}
		printLog("Waiting for " + selector + " to disappear... Tried: " + count + " times.")
		if (myjQuery(selector).length == 0) {
			var callbackNames = callbacks.map(c => c.name)
			printLog("waitForCommentsLoaded: Selector: " + selector + ", callbacks: " + callbackNames + ", count: " + count)
			callbacks.forEach(c => c())
		} else {
			setTimeout(function() {
				if (!count) {
					count = 0;
				}
				count++;
				if (count < 10) {
					waitForEl(selector, callbacks, count);
				} else { 
					return; 
				}
			}, 1000);
		}
	};
	waitForEl("." + showMoreCommentsButton, functionsToCall);
}

function parseAndSaveLinksFromDescription() {
	var description = myjQuery(descriptionSelector).html()
	var links = findLinksInHtml(description)
	if (links != null) {
		storeFoundGTNLinksForJiraIssue(links)
	} else {
		storeFoundGTNLinksForJiraIssue([])
	}
}

function parseGTNLinksFromPage(callback) {
	printLog("Parsing GTN links from current page")
	//Click on show more comments button
	myjQuery('.' + collapsedCommentsButton).trigger("click")
	//TODO can't figure out why the call above does not work!!	
	jQuery('.' + collapsedCommentsButton).trigger("click")
	
	//Wait for comments to be loaded
	//https://gist.github.com/chrisjhoughton/7890303
	waitForCommentsLoaded([parseAndSaveComments, parseAndSaveLinksFromDescription, callback])
}

function parseAndSaveComments() {
	printLog("Comments loaded");
	//classes: twixi-wrap verbose actionContainer
	var allLinks = []
	myjQuery(commentSelector).each(function() {
		var links = findLinksInHtml(myjQuery(this).html())

		if (links == null) {
			storeFoundGTNLinksForJiraIssue([])
		} else {
			if (links.length > 0) {
				allLinks = allLinks.concat(links)
			}
		}
 	});

	storeFoundGTNLinksForJiraIssue(allLinks)
}

function findLinksInHtml(html) {
	if (html == undefined || html == null) {
		return null
	}

	var urlRegex = /(\b(https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/ig;
	var links = html.match(urlRegex);
	
	if (links == null || links == undefined) {
		return []
	}

	let filterDupes = (links) => links.filter((v,i) => links.indexOf(v) === i)
	links = filterDupes(links)

	links = links.map(function(link) {
		if (link.indexOf(gtnQueryParam) != -1) {
			printLog("Found link matching GTN: " + link)
			return link;
		} else {
			return null
		}
	})

	links = links.filter(function(link) {
	  if (link == null) {
	    return false;
	  }
	  return true;
	})

	return links
}

function findLocalStorageItems(query, includeQueryInKeys) {
	//https://gist.github.com/n0m4dz/77f08d3de1b9115e905c
	var i, results = [];
	for (i in localStorage) {
		if (localStorage.hasOwnProperty(i)) {
		  if (i.match(query) || (!query && typeof i === 'string')) {
		    var key = i
		    if (!includeQueryInKeys && key.indexOf(query) == 0) {
		    	key = key.substr(query.length)
		    } 
		    
		    results.push({key:key, val:localStorage.getItem(i)});
		  }
		}
	}
	return results;
}


//Store functions for localStorage
function cleanupStorage() {
	var results = findLocalStorageItems("gtnmonkey_result_", true)
	results.forEach(r => {
		printLog("Deleting localStorage item " + r.key);
		window.localStorage.removeItem(r.key);
	})

	window.localStorage.removeItem("gtnmonkey_mainPage")
	window.localStorage.removeItem("gtnmonkey_jiraissues")
	window.localStorage.removeItem("gtnmonkey_number_of_jiraissues")
	window.localStorage.removeItem('gtnmonkey_progress')
	window.localStorage.removeItem('gtnmonkey_progress_str')

	enableButton(showResultsButtonSelector, false)
}

function storeFoundGTNLinksForJiraIssue(newLinks) {
	var jiraIssue = getJiraName()
	var jiraData = getStoredJiraDataForIssue(jiraIssue)
	storeFoundGTNLinks(jiraIssue, jiraData, newLinks)
}

function storeFoundGTNLinks(jiraIssue, jiraData, newLinks) {
	if (jiraData.links > 0) {
		printLog("Found data for '" + jiraIssue + "', appending data to it")
	}
	printLog("Found new GTN links: " + JSON.stringify(newLinks))
	var linksArray = Array.from(jiraData.links.values()).map(val => val.quantaLink).concat(newLinks)
	printLog("Updated links: " + JSON.stringify(linksArray))

	var jiraTitle = myjQuery(jiraSummarySelector).text()
	var data = new JiraData(jiraIssue, jiraTitle, linksArray)
	var dataJson = JSON.stringify(data)
	printLog("Storing JiraData: " + dataJson)
	window.localStorage.setItem('gtnmonkey_result_' + jiraIssue, dataJson);
}

function storeOriginPage() {
	var origin = window.location.href
	var filterName = myjQuery(jiraFilterNameSelector).text()
	window.localStorage.setItem('gtnmonkey_mainPage', origin)
	window.localStorage.setItem('gtnmonkey_filterName', filterName)
	printLog("Stored origin page: " + origin)
}

function storeFoundJiraIssues(jiraIssues) {
	var issueLinks
	if (jiraIssues === undefined) {
		issueLinks = myjQuery(jiraIssuesOnFilterPageSelector).map(function() {
      		return JIRA_SERVER_URL + myjQuery(this).attr('href');
		}).toArray();
		printLog("Found jira issues on origin (filter) page: " + issueLinks.toString())

		//Only store number of jira issues if this is the initial run
		window.localStorage.setItem('gtnmonkey_number_of_jiraissues', issueLinks.length)
	} else {
		printLog("Storing jira issues: " + jiraIssues.toString())
		issueLinks = jiraIssues
	}
	window.localStorage.setItem('gtnmonkey_jiraissues', JSON.stringify(issueLinks))

	return issueLinks
}

function storeProgress(state) {
	if (state != undefined && state != null) {
		window.localStorage.setItem('gtnmonkey_progress', state)
		window.localStorage.setItem('gtnmonkey_progress', state)
	}

	if (state == progressStarted) {
		//Don't increase progress counter if just started
		return
	}

	var numberOfFoundIssues = getNumberOfFoundJiraIssuesFromStorage()
	var prevProgress = window.localStorage.getItem('gtnmonkey_progress')

	var progress
	if (prevProgress == null || prevProgress === progressStarted) {
		progress = 1
	} else {
		progress = parseInt(prevProgress, 10) + 1
	}

	var jiraIssue = getJiraName()
	window.localStorage.setItem('gtnmonkey_progress', progress)
	window.localStorage.setItem('gtnmonkey_progress_str', `${progress} / ${numberOfFoundIssues} (Jira: ${jiraIssue})`)
	printLog("Stored progress: " + progress)
}

function stopProgress() {
	window.localStorage.setItem('gtnmonkey_progress', progressFinished)
	window.localStorage.setItem('gtnmonkey_progress_str', progressFinished)

	//https://stackoverflow.com/a/221297/1106893
	window.localStorage.setItem('gtnmonkey_progress_finished_at', Date.now())
	printLog("Stopped progress")
}

//Retrieve functions for localStorage
function getStoredJiraDataForIssue(jiraIssue) {
	return deserializeJiraData(localStorage.getItem('gtnmonkey_result_' + jiraIssue))
}

function deserializeJiraData(rawStr) {
	var jiraData = JSON.parse(rawStr)
	jiraData = Object.assign(new JiraData(null, null, []), jiraData)
	if (!(jiraData.links instanceof Map)) {
		jiraData.links = new Map(Object.entries(jiraData.links));
		//jiraData.links = JSON.parse(JSON.stringify(jiraData.links)).reduce((m, [key, val]) => m.set(key, val) , new Map());
	}
	printLog("Deserialized JiraData: " + JSON.stringify(jiraData))
	return jiraData
}

function deserializeAllJiraData() {
	var issues = findLocalStorageItems("gtnmonkey_result_", false)
	return issues.map(issue => deserializeJiraData(issue.val))
}

function getFoundJiraIssuesFromStorage() {
	return JSON.parse(localStorage.getItem("gtnmonkey_jiraissues") || "[]");
}

function getNumberOfFoundJiraIssuesFromStorage() {
	return window.localStorage.getItem('gtnmonkey_number_of_jiraissues')
}

function getOriginPageFromStorage() {
	return window.localStorage.getItem('gtnmonkey_mainPage')	
}

function getFilterNameFromStorage() {
	return window.localStorage.getItem('gtnmonkey_filterName')	
}

function getOverallProgress() {
	var overallProgress = window.localStorage.getItem('gtnmonkey_progress_str')
	if (overallProgress && overallProgress != null) {
		if (overallProgress === progressFinished) {
			return `Finished processing Jira filter '${getFilterNameFromStorage()}' with ${getNumberOfFoundJiraIssuesFromStorage()} items`
		} else {
			return `Processing Jira filter '${getFilterNameFromStorage()}': ${overallProgress}`		
		}
	}
	return "Unknown progress"
}

function hasAnyData() {
	var progress = window.localStorage.getItem('gtnmonkey_progress')
	if (progress == undefined || progress == null) {
		return false
	}
	return true
}

function isInProgress() {
	var progress = window.localStorage.getItem('gtnmonkey_progress')
	if (progress == null || progress === progressFinished) {
		return false
	}
	return true
}

function isFinished() {
	var progress = window.localStorage.getItem('gtnmonkey_progress')
	if (progress === progressFinished) {
		return true
	}
	return false
}

function isFinishedJustNow() {
	if (!isFinished) {
		return false
	}
	var finishedTime = window.localStorage.getItem('gtnmonkey_progress_finished_at')
	var now = Date.now()
	if (now - finishedTime <= 10000) {
		return true
	}
	return false
}

function getJiraName() {
	return window.location.href.split("browse/")[1]
}

function gotoNextPage(issues) {
	changeLocation(issues[0])
}

function gotoOriginPage() {
	changeLocation(getOriginPageFromStorage())
}

function changeLocation(location) {
	var origin = getOriginPageFromStorage()
	if (location !== origin) {
		storeProgress()
	}
	printLog("Changing location to: " + location)
	window.location.href = location
}

function printLog(message) {
	consoleMessage("log", message)
}

function printError(message) {
	consoleMessage("error", message)
}

function consoleMessage(type, message) {
	var originPage = window.location.href.startsWith(`${JIRA_SERVER_URL}/${JIRA_FILTERPAGE_URL_FRAGMENT}`)

	var jiraRef;
	if (originPage) {
		jiraRef = "ORIGIN: " + window.location.href.split(JIRA_ISSUES_URL_FRAGMENT)[1]
	} else {
		jiraRef = getJiraName()
	}

	var logPrefix = `GTN monkey (PAGE: ${jiraRef}, PROGRESS: ${getOverallProgress()}) `

	if (type === "log") {
		console.log(logPrefix + message)	
	} else if (type === "error") {
		console.error(logPrefix + message)
	} else {
		throw "Unrecognized log method type: " + type
	}
}

function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

//===============================
//On page ready
myjQuery(document).ready(function() {
	onDocumentReady()
});

function renderResultsOverlay() {
	var overlayDiv = myjQuery(`<div class="${overlayClass}" tabindex="0" aria-hidden="false"></div>`)
	overlayDiv.appendTo(myjQuery('body'))

	var progress = getOverallProgress()
	
	const markup = `
	 <div id="${gtnMonkeyDialogId}" class="jira-dialog box-shadow jira-dialog-open popup-width-custom jira-dialog-content-ready aui form-body" 
	 style="width: 900px;margin-left: -406px;margin-top: -383px;overflow: auto; max-height: 617px; overflow: auto">

		 <div class="jira-dialog-heading" style="height: auto">
		 	<div class="aui-toolbar2 qf-form-operations" role="toolbar">
		 		<div class="aui-toolbar2-inner">
		 			<div class="aui-toolbar2-secondary">
		 				<button id="validate-quanta-links" class="aui-button" resolved="" onclick="checkIfQuantaLinksAreAccessible()">Check Quanta links</button>
		 				<button id="close-overlay-button" class="aui-button" resolved="" onclick="closeResultsOverlay()">(X) Close</button>
		 			</div>
		 		</div>
		 	</div>
		 	<h2 title="${pageTitle}">${pageTitle}</h2>
		 	<h2 title="${progress}">${progress}</h2>
		 </div>
	    
	    <div class="jira-dialog-content">
	    	<div class="qf-container">
	    		<div class="qf-unconfigurable-form"></div>
	    	</div>
	    </div>
	 </div>
	`;

	var dialog = myjQuery(markup)
	dialog.appendTo(myjQuery('body'))

	showTable()
	myjQuery('#' + gtnMonkeyDialogId).hide();
	myjQuery('.' + overlayClass).hide();
}

//TABLE FUNCTIONS
function showTable() {
	var numberOfFoundIssues = getNumberOfFoundJiraIssuesFromStorage()


	const markup = `
	<div class="list-view">
		<div class="aui-group aui-group-split issue-table-info-bar">
			<div class="aui-item"><span class="results-count-text">
				<span class="results-count-start">1</span>–
				<span class="results-count-end">${numberOfFoundIssues}</span>
				</span>
			</div>
		</div>

		<div class="issue-table-container"><div><issuetable-web-component resolved="">
                <table id="issuetable">
                	<thead>
                		<tr class="rowHeader">
                			<th class="${rowNumberClass}">
                				<span title="${rowNumberClass}">#</span>
							</td>
                			<th class="colHeaderLink sortable headerrow-issuekey" rel="issuekey:ASC" data-id="issuekey" onclick="window.document.location='/issues/?jql=ORDER%20BY%20%22issuekey%22%20ASC'">
                				<span title="Sort By Key">Key</span>
                            </th>
                            <th class="colHeaderLink sortable headerrow-summary" rel="summary:ASC" data-id="summary" onclick="window.document.location='/issues/?jql=ORDER%20BY%20%22summary%22%20ASC'">
                                <span title="Sort By Summary">Summary</span>
                            </th>
                            <th>
                                <span title="links">GTN Links</span>
                            </th>
                            <th>
                                <span title="quanta-testlogs">Test logs</span>
                            </th>
                            <th>
                                <span title="quanta-diagbundles">Diag bundles</span>
                            </th>
                        </tr>
                    </thead>

                    <tbody id="${gtnMonkeyResultsTableBody}" class="ui-sortable">
                    <tr></tr>
                    </tbody>
	`
	var table = myjQuery(markup)
	table.appendTo(myjQuery('#' + gtnMonkeyDialogId))

	var allJiraData = deserializeAllJiraData()
	allJiraData.forEach(jd => {
		appendRowToResultTable(jd)
	})
}

function appendRowToResultTable(jiraData) {
	
	function makeCopyIcon(idOfItemToCopy) {
		//defer copy as table row is not yet created
		var funcCall = `copyText($('${idOfItemToCopy}').find('a')[0].download)`
		return `<img onclick="${funcCall}" src="${SERVER_URL}/copy-icon.png" alt="copy" style="width:15px;height:15px;cursor: pointer;">`
	}
	//TODO refactor ternary quanta logs / quanta diag logs template string generator into function
	function createRow(jiraData) {
		const template = 
		`
		<tr class="${gtnMonkeyResultsIssueRow} issue-table-draggable">
			<td class="${rowNumberClass}" id="${rowNumberClass}-${jiraData.id}">
			</td>
			<td class="issuekey">
				<a class="issue-link" data-issue-key="${jiraData.id}" href="/browse/${jiraData.id}">${jiraData.id}</a>
			</td>
			<td class="summary">
				<p><a class="issue-link" data-issue-key="${jiraData.id}" href="/browse/${jiraData.id}">${jiraData.title}</a></p>
			</td>
			<td>
			${jiraData.links.size > 0 ?
				`${Array.from(jiraData.links, ([gtn, value]) => `<p><a href="${value.quantaLink}">${gtn}</a></p>`).join('')}` :
				"<p>N/A</p>"
			}
			</td>
			<td>
			${jiraData.links.size > 0 ?
				`${Array.from(jiraData.links, ([gtn, value]) => 
					`<p id="${quantaTestLogParagraphIdPrefix}-${jiraData.id}-${gtn}">
						<a href="${value.quantaTestLog}" download=${value.quantaTestLogDownloadName}>${gtn}</a>
						${makeCopyIcon(`#${quantaTestLogParagraphIdPrefix}-${jiraData.id}-${gtn}`)}
					</p>`).join('')}` :
				"<p>N/A</p>"
			}
			</td>
			<td>
			${jiraData.links.size > 0 ?
				`${Array.from(jiraData.links, ([gtn, value]) => 
					`<p id="${quantaBundleParagraphIdPrefix}-${jiraData.id}-${gtn}">
						<a href="${value.quantaDiagBundle}" download=${value.quantaDiagBundleDownloadName}>${gtn}</a>
						${makeCopyIcon(`#${quantaBundleParagraphIdPrefix}-${jiraData.id}-${gtn}`)}
					</p>`).join('')}` :
				"<p>N/A</p>"
			}
			</td>
		</tr>
		`
		return template
	}

	printLog("Appending row: " + jiraData)

	var html = createRow(jiraData);
	myjQuery('#' + gtnMonkeyResultsTableBody + ' tr').last().after(html);
	myjQuery('#' + gtnMonkeyResultsTableBody + ' tr.' + gtnMonkeyResultsIssueRow).each((idx, elem) => {
		console.log($(elem).find('td.' + rowNumberClass).length); 
		$(elem).find('td.' + rowNumberClass).text(idx + 1);
	});

	//Add download handler - https://stackoverflow.com/a/33830576/1106893
	//TODO
	// if (jiraData.links.size > 0) {
	// 	Array.from(jiraData.links.keys()).forEach(gtn => {
	// 		setupDownloadHandler("quantalog", jiraData, gtn)
	// 		setupDownloadHandler("quantabundle", jiraData, gtn)
	// 	})
	// }


}

function downloadHandler(evt) {
    evt.preventDefault();
    var name = this.download;
   
    getQuantaURL(this.href)
        .then(res => {printLog("Download complete for URL: " + res.url); return res.blob()})
        .then(blob => {
            $("<a>").attr({
                download: name,
                href: URL.createObjectURL(blob)
            })[0].click();
        });
}

function setupDownloadHandler(prefix, jiraData, gtn) {
	var id = `#${prefix}-${jiraData.id}-${gtn}`
	var linkRef = $(id).find("a")
	if (linkRef.length != 0) {
		printError("Link was not found with id: " + id)
	}
	linkRef.click(downloadHandler);
} 

function addResultsToTable() {
	var jiraIssue = getJiraName()
	var jiraData = getStoredJiraDataForIssue(jiraIssue)
	appendRowToResultTable(jiraData)
}

function filterJqueryElements(elementType, regexStr) {
	return $(elementType).filter(function() {
   		return this.id.match(new RegExp(regexStr));
  	})
}

function checkIfQuantaLinksAreAccessible() {
	function extractGtnFromURL(url) {
		if (url.indexOf(quantaUrlSplitAlong) != -1) {
			return url.split(quantaUrlSplitAlong)[1].split('/')[0]
		} else {
			console.error(`Unexpected URL, URL should contain '${quantaUrlSplitAlong}'. Got URL: ${resonse.url}`)
		}
	}

	function highlightElements(elementType, type, gtn, available) {
		color = available ? colorLightGreen : colorGrey
		filterJqueryElements(elementType, `${type}-.*-${gtn}`).css("background-color", color);
	}

	function handleQuantaFetchResult(url, result) {
		//result: boolean
		var gtn = extractGtnFromURL(url)
		if (url.indexOf(urlFragmentTestLogs) != -1) {
			highlightElements("p", quantaTestLogParagraphIdPrefix, gtn, result)	
		} else if (url.indexOf(urlFragmentDiagBundle) != -1) {
			highlightElements("p", quantaBundleParagraphIdPrefix, gtn, result)
		}
	}

	function checkLinks() {
		allJiraData.forEach(jd => {
			jd.links.forEach((value, key, map) => {
				validateQuantaURL(map.get(key).quantaTestLog, handleQuantaFetchResult)
				validateQuantaURL(map.get(key).quantaDiagBundle, handleQuantaFetchResult)
				})
			})
	}

	var allJiraData = deserializeAllJiraData()
	checkURL(CORS_ANYWHERE_SERVER_URL, () => { //successcallback

		//Perform VPN check
		validateQuantaURL(QUANTA_URL_VPN_CHECK, () => {
			checkLinks()
		}, () => {
			printError("QUANTA IS NOT AVAILABLE! PLEASE MAKE SURE YOU ARE CONNECTED TO VPN!")
			//TODO Only run this if bypass-VPN check checkbox is ticked 
			//checkLinks()
		})
		
		}, () => { //errorcallback
			printError("CORS-ANYWHERE SERVER IS NOT AVAILABLE!")
		}
	)
}

async function getURL(url = '', method = 'HEAD') {
  const response = await fetch(url, {
	method: method,
	mode: 'cors',
	cache: 'no-cache',
	credentials: 'same-origin'
  });
  return await response 
}

function getQuantaURL(url) {
	return getURL(`${CORS_ANYWHERE_SERVER_URL}/${url}`, "GET")
}

function validateQuantaURL(url, successCallback, errorCallback) {
	getURL(`${CORS_ANYWHERE_SERVER_URL}/${url}`).then((response) => {
    	printLog(`Request result:: URL: ${response.url}, response OK: ${response.ok}, response status: ${response.status}`)
    	
    	if (response.ok && response.status == 200) {
    		printLog(`Quanta link ${response.url} is valid and reachable.`)
    	} else if (response.status == 404) {
    		printLog(`Quanta Link ${response.url}  is expired, got HTTP status ${response.status}!`)
    	} else {
    		printLog(`Cannot access Quanta link ${response.url}, got HTTP status: ${response.status}!`)
    	}

    	if (response.status == 200 || response.status == 404) {
    		printLog("Calling callback function...")
    		successCallback(response.url, response.status == 200 ? true : false)
    	}
  	}).catch(function (error) {
    	printError('Request failed', error);
    	errorCallback(response.url, response.status)
	});
}

function checkURL(url, successCallback, errorCallback) {
	getURL(url).then((response) => {
    	printLog(`Request result:: URL: ${response.url}, response OK: ${response.ok}, response status: ${response.status}`)
    	if (response.ok && response.status == 200) {
    		printLog(`URL ${response.url} is valid and reachable. Calling callback function...`)
    		successCallback()
    	} else {
    		printLog(`Cannot access URL ${response.url}, got HTTP status: ${response.status}!`)
    		errorCallback()
    	}
  	}).catch(function (error) {
    	printError('Request failed', error);
    	errorCallback()
	});
}

function copyText(str) {
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

renderResultsOverlay()
if (isInProgress() || isFinishedJustNow()) {
	printLog("Showing overlay...")
	showResultsOverlay()
}