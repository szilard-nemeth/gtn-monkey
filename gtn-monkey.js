function findAllLinksFromJiraIssues() {
	var issues = getFoundJiraIssuesFromStorage()

	//Starting up the scraping process
	//https://jira.cloudera.com/issues/?filter=
	var originPage = window.location.href.startsWith("https://jira.cloudera.com/issues/?filter=")

	if (originPage) {
		cleanupStorage()
		storeOriginPage()
		storeFoundJiraIssues()
		changeLocation(getFoundJiraIssuesFromStorage()[0])
	}


	//On page ready
	$(document).ready(function() {
		console.log("EXECUTED document.ready() on page: " + window.location.href)
		var issues = getFoundJiraIssuesFromStorage()
		console.log("Retrieved jira issues: ", issues)

		if (!issues || issues.length == 0) {
			console.log("NO JIRA ISSUES FOUND!")
			return
		}
		
		if (window.location.href === issues[0]) {
			//Parse GTN links
			parseGTNLinksFromPage()
			var parsedPage = issues.shift()
			console.log("Parsed GTN links from page: " + parsedPage)

			//Go to next page
			if (issues.length > 0) {
				var newLocation = issues[0]
				changeLocation(newLocation)
				
			} else {
				console.log("No more pages to process. Changing location to original jira URL: " + getOriginalPageFromStorage())
				//TODO print all results and go back to original page!
				changeLocation(getOriginalPageFromStorage())	
			}
		} else {
			console.error("window.location.href != issues[0]. current page: " + window.location.href + " issues[0]: " + issues[0])
		}
	});
}

function loadGtnLinks(issueLinks) {
	issueLinks.forEach(function(issue, idx) {
		// (async () => {
		// 	let response = await fetch(issue);
		// 	let html = await response.text();
		// 	console.log("Received html: ", html)
		// 	}
	 //    )()
	 loadToIframe(issue, idx)
	})
}

// <iframe id="iframe" name="myIframe" frameborder="5" width="500" height="300"></iframe>

function loadToIframe(url, id) {
	console.log("Loading url " + url + " to iframe id: " + id)
	var iframeId = 'iframe' + id
	var iframe = document.createElement(iframeId);
	iframe.setAttribute('id', iframeId);
	iframe.setAttribute('width', "500");
	iframe.setAttribute('height', "300");
	iframe.setAttribute('src', url);
	$('#' + iframeId).on( 'load', function() {
	    // code will run after iframe has finished loading
	    console.log("IFRAME LOADED")
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
	      console.log("count: " + count);
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
	storeFoundGTNLinksForJiraIssue(links)
}

function parseGTNLinksFromPage() {
	console.log("Parsing GTN links from current page: " + window.location.href)
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
	console.log("***COMMENTS LOADED");
	//classes: twixi-wrap verbose actionContainer
	var allLinks = []
	$('.twixi-wrap > .action-body').each(function() {
		// console.log($(this).html());
		// console.log("found: " + findLinksInHtml($(this).html()))
		var links = findLinksInHtml($(this).html())

		if (links == null) {
			storeFoundGTNLinksForJiraIssue([])
		} else {
			links = links.map(function(link) {
			if (link.indexOf("gtn=") != -1) {
				console.log("Found link matching GTN: " + link)
				return link;
			} else {
				return null
			}
			})
			//console.log("***links: " + JSON.stringify(links))
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
		console.log("Deleting localStorage item " + r.key);
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
		console.log("Found data for '" + storageKey + "', appending data to it")
	}	
	console.log("Found new GTN links for jira " + jiraIssue + ": " + JSON.stringify(newLinks))
	window.localStorage.setItem('gtnmonkey_result_' + jiraIssue, JSON.stringify(gtnLinks.concat(newLinks)));
}

function storeOriginPage() {
	window.localStorage.setItem('gtnmonkey_mainPage', window.location.href)
}

function storeFoundJiraIssues() {
	var issueLinks = $('.issue-table-container .issuekey a').map(function() {
      return "https://jira.cloudera.com" + $(this).attr('href');
	}).toArray();
	console.log("Found jira issues: ", issueLinks)
	window.localStorage.setItem('gtnmonkey_jiraissues', JSON.stringify(issueLinks))
}

//Retrieve functions for localStorage
function getFoundGTNLinksForJiraIssue(jiraIssue) {
	var storageKey = 'gtnmonkey_result_' + jiraIssue
	return JSON.parse(localStorage.getItem(storageKey) || "[]");
}

function getFoundJiraIssuesFromStorage() {
	return JSON.parse(localStorage.getItem("gtnmonkey_jiraissues") || "[]");
}

function getOriginalPageFromStorage() {
	return window.localStorage.getItem('gtnmonkey_mainPage')	
}

function getJiraName() {
	return window.location.href.split("browse/")[1]
}

function changeLocation(location) {
	console.log("Changing location to: " + location)
	window.location.href = location
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
    console.log("anchor:", anchor)
    divider.appendTo($('.board-header'));
    anchor.appendTo($('.board-header'));
}


 
// loadGtnLinks(issueLinks.slice(0, 1))