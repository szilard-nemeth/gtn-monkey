class JiraData {
  constructor(id, title, links) {    
    this.id = id;
    this.title = title;

    if (links == null || links == undefined) {
    	this.links = []
    }
    this.links = links;
  }
}

function findAllLinksFromJiraIssues() {
	//Start up the scraping process
	storeOriginPage()
	
	var issues = storeFoundJiraIssues()
	if (!issues || issues.length == 0) {
		//TODO show this message as a popup?
		printLog("NO JIRA ISSUES FOUND IN CURRENT PAGE!")
		return
	}

	gotoNextPage(getFoundJiraIssuesFromStorage())
}

function onDocumentReady() {
	printLog("Executed document.ready() on page: " + window.location.href)

	var originPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")
	if (originPage && !isInProgress()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
	}

	if (isInProgress()) {
		var issues = getFoundJiraIssuesFromStorage()
		printLog("Retrieved jira issues from storage: " + issues)

		//double-check URL
		if (issues && issues.length > 0 && window.location.href === issues[0]) {
			if (isInProgress()) {
				showOverlay()
			}
			parseGTNLinksFromPage(navigateToNextPageCallback)
			
		} else if (location == getOriginPageFromStorage() && isInProgress()) {
			//Show overlay if we got back to the origin page in order to show final results
			stopProgress()
			showOverlay()
		} else {
			console.error("window.location.href != issues[0]. current page: " + window.location.href + " issues[0]: " + issues[0])
		}
	}
}

function navigateToNextPageCallback() {
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
		if ($(selector).length == 0) {
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

	//<span class="show-more-comments" data-collapsed-count="18">Loading...</span>
	var selector = $(".show-more-comments");

	waitForEl(".show-more-comments", functionsToCall);
}

function parseAndSaveLinksFromDescription() {
	var description = $('#descriptionmodule p').html()
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

	//<a class="collapsed-comments" href="/browse/CDH-76879?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&amp;showAll=true">
	//<span class="collapsed-comments-line"></span>
	//<span class="collapsed-comments-line"></span><span class="show-more-comments" data-collapsed-count="18">18 older comments</span></a>
	$('.collapsed-comments').trigger('click')
	

	//Wait for comments to be loaded
	//https://gist.github.com/chrisjhoughton/7890303
	waitForCommentsLoaded([parseAndSaveComments, parseAndSaveLinksFromDescription, callback])
}

function parseAndSaveComments() {
	printLog("Comments loaded");
	//classes: twixi-wrap verbose actionContainer
	var allLinks = []
	$('.twixi-wrap > .action-body').each(function() {
		var links = findLinksInHtml($(this).html())

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

	var urlRegex =/(\b(https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/ig;
	var links = html.match(urlRegex);
	
	if (links == null || links == undefined) {
		return []
	}

	let filterDupes = (links) => links.filter((v,i) => links.indexOf(v) === i)
	links = filterDupes(links)

	links = links.map(function(link) {
		if (link.indexOf("gtn=") != -1) {
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
		    value = JSON.parse(localStorage.getItem(i));

		    var key = i
		    if (!includeQueryInKeys && key.indexOf(query) == 0) {
		    	key = key.substr(query.length)
		    } 
		    results.push({key:key, val:value});
		  }
		}
	}
	return results;
}


//Store functions for localStorage
function cleanupStorage() {
	//CLEANS UP THE FOLLOWING LOCALSTORAGE KEYS: 
	//gtnmonkey_result_*
	//gtnmonkey_mainPage
	//gtnmonkey_jiraissues
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

	jiraData.links = jiraData.links.concat(newLinks)
	printLog("Found new GTN links: " + JSON.stringify(newLinks))

	var jiraTitle = $('#summary-val').text()
	var data = new JiraData(jiraIssue, jiraTitle, jiraData.links)
	var dataJson = JSON.stringify(data)
	printLog("Storing JiraData: " + dataJson)
	window.localStorage.setItem('gtnmonkey_result_' + jiraIssue, dataJson);
}

function storeOriginPage() {
	var origin = window.location.href
	window.localStorage.setItem('gtnmonkey_mainPage', origin)
	printLog("Stored origin page: " + origin)
}

function storeFoundJiraIssues(jiraIssues) {
	var issueLinks
	if (jiraIssues === undefined) {
		issueLinks = $('.issue-table-container .issuekey a').map(function() {
      		return "https://jira.cloudera.com" + $(this).attr('href');
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

function storeProgress() {
	var numberOfFoundIssues = getNumberOfFoundJiraIssuesFromStorage()
	var prevProgress = window.localStorage.getItem('gtnmonkey_progress')

	var progress
	if (prevProgress == null) {
		progress = 1
	} else {
		progress = parseInt(prevProgress, 10) + 1
	}
	window.localStorage.setItem('gtnmonkey_progress', progress)
	window.localStorage.setItem('gtnmonkey_progress_str', '' + progress + "/" + numberOfFoundIssues)
	printLog("Stored progress: " + progress)
}

function stopProgress() {
	window.localStorage.removeItem('gtnmonkey_progress')
	window.localStorage.removeItem('gtnmonkey_progress_str')
	printLog("Stopped progress")
}

//Retrieve functions for localStorage
function getStoredJiraDataForIssue(jiraIssue) {
	var jiraData = JSON.parse(localStorage.getItem('gtnmonkey_result_' + jiraIssue))
	jiraData = Object.assign(new JiraData(null, null, []), jiraData)

	return jiraData
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

function getOverallProgress() {
	return window.localStorage.getItem('gtnmonkey_progress_str')
}

function isInProgress() {
	return window.localStorage.getItem('gtnmonkey_progress') != null
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

function printLog(logMessage) {
	var originPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")

	var jiraRef;
	if (originPage) {
		jiraRef = "ORIGIN: " + window.location.href.split("issues/?")[1]
	} else {
		jiraRef = getJiraName()
	}

	var logPrefix = `GTN monkey (PAGE: ${jiraRef}, PROGRESS: ${getOverallProgress()}) ` 
	console.log(logPrefix + logMessage)
}

function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function createButton(title, funcToCall, icon) {
    var divider = $('<span class="board-header-btn-divider"></span>')

    if (title === undefined || title == "") {
    	throw "Title should be defined!"
    }

    if (funcToCall === undefined || funcToCall == "" || !isFunction(funcToCall)) {
    	throw "funcToCall should be a valid function!"
    }

    var href = `javascript:${funcToCall.name}();`
    var anchorClass = "board-header-btn board-header-btn-without-icon board-header-btn-text"
    var anchor = $(`<a class="${anchorClass}" href="${href}" title="${title}">${title}</a>`.trim())
    divider.appendTo($('.board-header'));
    anchor.appendTo($('.board-header'));
}

//===============================
//On page ready
$(document).ready(function() {
	onDocumentReady()
});

function showOverlay() {

	var overlayDiv = $(`<div class="aui-blanket" tabindex="0" aria-hidden="false"></div>`)
	overlayDiv.appendTo($('body'))


	var title = "GTN MONKEY"
	progress = getOverallProgress()
	const markup = `
	 <div id="gtnmonkey-dialog" class="jira-dialog box-shadow jira-dialog-open popup-width-custom jira-dialog-content-ready" style="width: 810px; margin-left: -406px; margin-top: -383px;">
	    <h2 title="${title}">${title}</h2>
	    <h2 title="${progress}">Processing: ${progress}</h2>
	    <div class="jira-dialog-content">
	    	<div class="qf-container">
	    		<div class="qf-unconfigurable-form"></div>
	    	</div>
	    </div>
	 </div>
	`;

	var dialog = $(markup)
	dialog.appendTo($('body'))

	showTable()
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
                <table id="gtnmonkey-results">
                	<thead>
                		<tr class="rowHeader">
                			<th class="colHeaderLink sortable headerrow-issuekey" rel="issuekey:ASC" data-id="issuekey" onclick="window.document.location='/issues/?jql=ORDER%20BY%20%22issuekey%22%20ASC'">
                				<span title="Sort By Key">Key</span>
                            </th>
                            <th class="colHeaderLink sortable headerrow-summary" rel="summary:ASC" data-id="summary" onclick="window.document.location='/issues/?jql=ORDER%20BY%20%22summary%22%20ASC'">
                                <span title="Sort By Summary">Summary</span>
                            </th>
                            <th>
                                <span title="links">GTN Links</span>
                            </th>
                        </tr>
                    </thead>

                    <tbody id="gtnmonkey-results-tbody" class="ui-sortable">
                    <tr></tr>
                    </tbody>
	`
	var table = $(markup)
	table.appendTo($('#gtnmonkey-dialog'))

	var results = findLocalStorageItems("gtnmonkey_result_", false)
	results.forEach(r => {
		appendRowToResultTable(r.key, r.val)
	})
}

function appendRowToResultTable(issueKey, jiraData) {
	
	function createRow(jiraData) {
		const template = 
		`
		<tr>
			<td class="issuekey">
				<a class="issue-link" data-issue-key="${jiraData.id}" href="/browse/${jiraData.id}">${jiraData.id}</a>
			</td>
			<td class="summary">
				<p><a class="issue-link" data-issue-key="${jiraData.id}" href="/browse/${jiraData.id}">${jiraData.title}</a></p>
			</td>
			<td>
			${jiraData.links.length > 0 ?
				`${jiraData.links.map((link, i) => `<p><a href="${link}">${link.split("gtn=")[1]}</a></p>`).join('')}` :
				"<p>N/A</p>"
			}
			</td>
		</tr>
		`
		return template
	}

	var html = createRow(jiraData);
	$('#gtnmonkey-results-tbody tr').last().after(html);
}

function addResultsToTable() {
	var jiraIssue = getJiraName()
	var jiraData = getStoredJiraDataForIssue(jiraIssue)
	appendRowToResultTable(jiraIssue, jiraData)
}