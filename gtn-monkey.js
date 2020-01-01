function findAllLinksFromJiraIssues() {
	var issues = getFoundJiraIssuesFromStorage()

	//Starting up the scraping process
	//https://jira.cloudera.com/issues/?filter=
	var originPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")


	if (originPage) {
		cleanupStorage()
		storeOriginPage()
		storeFoundJiraIssues()
		gotoNextPage(getFoundJiraIssuesFromStorage())
	}
}

function onDocumentReady() {
	printLog("Executed document.ready() on page: " + window.location.href)
	printProgress()
	var issues = getFoundJiraIssuesFromStorage()
	printLog("Retrieved jira issues: " + issues)

	if (!issues || issues.length == 0) {
		printLog("NO JIRA ISSUES FOUND!")
		return
	}
	
	//double-check URL
	if (window.location.href === issues[0]) {
		//Parse GTN links
		parseGTNLinksFromPage()
		var parsedPage = issues.shift()
		//store modified array to localStorage so next execution of onDocumentReady() picks up next page
		storeFoundJiraIssues(issues)

		printLog("Parsed GTN links from page: " + parsedPage)

		//Go to next page
		if (issues.length > 0) {
			gotoNextPage(issues)
		} else {
			printLog("No more pages to process. Changing location to origin jira URL: " + getOriginalPageFromStorage())
			//TODO print all results and go back to original page!
			gotoOriginPage()	
		}
	} else {
		console.error("window.location.href != issues[0]. current page: " + window.location.href + " issues[0]: " + issues[0])
	}
}

function loadGtnLinks(issueLinks) {
	issueLinks.forEach(function(issue, idx) {
		// (async () => {
		// 	let response = await fetch(issue);
		// 	let html = await response.text();
		// 	printLog("Received html: ", html)
		// 	}
	 //    )()
	 loadToIframe(issue, idx)
	})
}

// <iframe id="iframe" name="myIframe" frameborder="5" width="500" height="300"></iframe>

function loadToIframe(url, id) {
	printLog("Loading url " + url + " to iframe id: " + id)
	var iframeId = 'iframe' + id
	var iframe = document.createElement(iframeId);
	iframe.setAttribute('id', iframeId);
	iframe.setAttribute('width', "500");
	iframe.setAttribute('height', "300");
	iframe.setAttribute('src', url);
	$('#' + iframeId).on( 'load', function() {
	    // code will run after iframe has finished loading
	    printLog("IFRAME LOADED")
	} );

	$('#' + iframeId).load(url)
	// document.body.appendChild(iframe);
	$('.navigator-body').append(iframe)
	
}

function myHandler() {
        alert('iframe (almost) loaded');
    }
$(document).on('iframeready', myHandler);






function waitForCommentsLoaded(functionsToCall) {
	var waitForEl = function(selector, callbacks, count) {
	  if ($(selector).length == 0) {
	  	callbacks.forEach(c => c())
	    // callback();
	  } else {
	    setTimeout(function() {
	      if(!count) {
	        count=0;
	      }
	      count++;
	      printLog("count: " + count);
	      if(count<10) {
	        waitForEl(selector, callbacks, count);
	      } else {return;}
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

function parseGTNLinksFromPage() {
	printLog("Parsing GTN links from current page: " + window.location.href)
	//Click on show more comments button

	//<a class="collapsed-comments" href="/browse/CDH-76879?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&amp;showAll=true">
	//<span class="collapsed-comments-line"></span>
	//<span class="collapsed-comments-line"></span><span class="show-more-comments" data-collapsed-count="18">18 older comments</span></a>
	$('.collapsed-comments').trigger('click')
	

	//Wait for comments to be loaded
	//https://gist.github.com/chrisjhoughton/7890303
	waitForCommentsLoaded([parseAndSaveComments, parseAndSaveLinksFromDescription])
}

function parseAndSaveComments() {
	printLog("***COMMENTS LOADED");
	//classes: twixi-wrap verbose actionContainer
	var allLinks = []
	$('.twixi-wrap > .action-body').each(function() {
		// printLog($(this).html());
		// printLog("found: " + findLinksInHtml($(this).html()))
		var links = findLinksInHtml($(this).html())

		if (links == null) {
			storeFoundGTNLinksForJiraIssue([])
		} else {
			links = links.map(function(link) {
			if (link.indexOf("gtn=") != -1) {
				printLog("Found link matching GTN: " + link)
				return link;
			} else {
				return null
			}
			})
			//printLog("***links: " + JSON.stringify(links))
			links = links.filter(function(link) {
			  if (link == null) {
			    return false;
			  }
			  return true;
			})
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
	var found = html.match(urlRegex);
	return found
}


//Store functions for localStorage
function cleanupStorage() {
	//CLEANS UP THE FOLLOWING LOCALSTORAGE KEYS: 
	//gtnmonkey_result_*
	//gtnmonkey_mainPage
	//gtnmonkey_jiraissues

	//https://gist.github.com/n0m4dz/77f08d3de1b9115e905c
	function findLocalItems(query) {
		var i, results = [];
		for (i in localStorage) {
		if (localStorage.hasOwnProperty(i)) {
		  if (i.match(query) || (!query && typeof i === 'string')) {
		    value = JSON.parse(localStorage.getItem(i));
		    results.push({key:i,val:value});
		  }
		}
		}
		return results;
	}
	var results = findLocalItems("gtnmonkey_result_")
	results.forEach(r => {
		printLog("Deleting localStorage item " + r.key);
		window.localStorage.setItem(r.key, null);
	})

	window.localStorage.setItem("gtnmonkey_mainPage", null)
	window.localStorage.setItem("gtnmonkey_jiraissues", null)
}

function storeFoundGTNLinksForJiraIssue(newLinks) {
	var jiraIssue = getJiraName()
	var gtnLinks = getFoundGTNLinksForJiraIssue(jiraIssue)
	storeFoundGTNLinks(jiraIssue, gtnLinks, newLinks)
}

function storeFoundGTNLinks(jiraIssue, gtnLinks, newLinks) {
	if (gtnLinks > 0) {
		printLog("Found data for '" + storageKey + "', appending data to it")
	}	
	printLog("Found new GTN links for jira " + jiraIssue + ": " + JSON.stringify(newLinks))
	window.localStorage.setItem('gtnmonkey_result_' + jiraIssue, JSON.stringify(gtnLinks.concat(newLinks)));
}

function storeOriginPage() {
	window.localStorage.setItem('gtnmonkey_mainPage', window.location.href)
}

function storeFoundJiraIssues(jiraIssues) {
	var issueLinks
	if (jiraIssues === undefined) {
		issueLinks = $('.issue-table-container .issuekey a').map(function() {
      		return "https://jira.cloudera.com" + $(this).attr('href');
		}).toArray();
		printLog("Found jira issues: " + issueLinks.toString())
	} else {
		issueLinks = jiraIssues
	}
	window.localStorage.setItem('gtnmonkey_jiraissues', JSON.stringify(issueLinks))
	window.localStorage.setItem('gtnmonkey_number_of_jiraissues', issueLinks.length)
}

function storeProgress(itemIdx) {
	var numberOfFoundIssues = getNumberOfFoundJiraIssuesFromStorage()
	var prevProgress = window.localStorage.getItem('gtnmonkey_progress')

	var progress
	if (prevProgress == null) {
		progress = 1
	} else {
		progress = window.localStorage.getItem('gtnmonkey_progress')
		progress++
	}
	window.localStorage.setItem('gtnmonkey_progress', progress)
	window.localStorage.setItem('gtnmonkey_progress_str', '' + progress + "/" + numberOfFoundIssues)
	printLog("Stored progress: " + progress)
}

//Retrieve functions for localStorage
function getFoundGTNLinksForJiraIssue(jiraIssue) {
	var storageKey = 'gtnmonkey_result_' + jiraIssue
	var gtnLinks = localStorage.getItem(storageKey)

	//TODO figure out why "null" is saved to localStorage
	if (gtnLinks == null || gtnLinks === "null") {
		return JSON.parse("[]")
	} else {
		return JSON.parse(gtnLinks)
	}
	// return JSON.parse(localStorage.getItem(storageKey) || "[]");
}

function getFoundJiraIssuesFromStorage() {
	return JSON.parse(localStorage.getItem("gtnmonkey_jiraissues") || "[]");
}

function getNumberOfFoundJiraIssuesFromStorage() {
	return window.localStorage.getItem('gtnmonkey_number_of_jiraissues')
}

function getOriginalPageFromStorage() {
	return window.localStorage.getItem('gtnmonkey_mainPage')	
}

function printProgress() {
	var progress = window.localStorage.getItem('gtnmonkey_progress')
	var progressStr = window.localStorage.getItem('gtnmonkey_progress_str')
	printLog("Processing page: " + progress)
	printLog("Processing page: " + progressStr)
}

function getJiraName() {
	return window.location.href.split("browse/")[1]
}

function gotoNextPage(issues) {
	changeLocation(issues[0])
}

function gotoOriginPage() {
	changeLocation(getOriginalPageFromStorage())
}

function changeLocation(location) {
	var origin = getOriginalPageFromStorage()
	if (location !== origin) {
		storeProgress()
	}
	printLog("Changing location to: " + location)
	window.location.href = location
}

function printLog(logMessage) {
	console.log("GTN monkey: " + logMessage)
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
    printLog("anchor:", anchor)
    divider.appendTo($('.board-header'));
    anchor.appendTo($('.board-header'));
}

//On page ready
$(document).ready(function() {
	onDocumentReady()
});


 
// loadGtnLinks(issueLinks.slice(0, 1))