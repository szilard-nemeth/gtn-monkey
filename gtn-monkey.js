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

	
loadGtnLinks(issueLinks.slice(0, 1))