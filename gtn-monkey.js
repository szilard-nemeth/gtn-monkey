var issueLinks = $('.issue-table-container .issuekey a').map(function() {
      return "https://jira.cloudera.com" + $(this).attr('href');
}).toArray();


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






function waitForCommentsLoaded(funcToCall) {
	var waitForEl = function(selector, callback, count) {
	  if ($(selector).length == 0) {
	    callback();
	  } else {
	    setTimeout(function() {
	      if(!count) {
	        count=0;
	      }
	      count++;
	      console.log("count: " + count);
	      if(count<10) {
	        waitForEl(selector,callback,count);
	      } else {return;}
	    }, 1000);
	  }
	};

	//<span class="show-more-comments" data-collapsed-count="18">Loading...</span>
	var selector = $(".show-more-comments");

	waitForEl(".show-more-comments", funcToCall);
}

function findLinksInDescription() {
	var description = $('#descriptionmodule p').html()
	return findLinksInHtml(description)
}

function findLinksInComments() {
	//Click on show more comments button

	//<a class="collapsed-comments" href="/browse/CDH-76879?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&amp;showAll=true">
	//<span class="collapsed-comments-line"></span>
	//<span class="collapsed-comments-line"></span><span class="show-more-comments" data-collapsed-count="18">18 older comments</span></a>
	$('.collapsed-comments').trigger('click')
	

	//Wait for comments to be loaded
	//https://gist.github.com/chrisjhoughton/7890303
	waitForCommentsLoaded(parseAndSaveComments)
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
			window.localStorage.setItem(getLocalStorageKeyForJira(), JSON.stringify([]));
		} else {
			links = links.map(function(link) {
			if (link.indexOf("gtn=") != -1) {
				console.log("***found link matching GTN: " + link)
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

	console.log("Found links for jira " + getJiraName() + ": " + JSON.stringify(allLinks))
 	window.localStorage.setItem(getLocalStorageKeyForJira(), JSON.stringify(allLinks));
}

function findLinksInHtml(html) {
	var urlRegex =/(\b(https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/ig;
	var found = html.match(urlRegex);
	return found
}

function getLocalStorageKeyForJira() {
	return 'gtnmonkey_' + getJiraName()
}

function getJiraName() {
	return window.location.href.split("browse/")[1]
}
 
findLinksInComments()
// loadGtnLinks(issueLinks.slice(0, 1))