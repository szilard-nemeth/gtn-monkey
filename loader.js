console.log("Loaded loader.js")

function loadScript(src, onloadCallback) {
	var script = document.createElement("script");
	script.type = "text/javascript"
	script.src = src;

	if (onloadCallback) {
		script.onload = onloadCallback
	}

	// document.getElementsByTagName("head")[0].appendChild(tag);
	document.getElementsByTagName("head")[0].insertAdjacentElement('afterbegin', script)
}

function findWithAttr(array, attr, value) {
	for (var i = 0; i < array.length; i += 1) {
	    if (array[i][attr] === value || array[i][attr].indexOf(value) != -1) {
	        return i;
	    }
	}
	return -1;
}

function loadScripts() {
    //https://www.quora.com/How-can-I-import-JQuery-into-my-js-file
    //https://code.jquery.com/jquery-3.4.1.min.js
    loadScript("https://code.jquery.com/jquery-1.7.2.min.js", () => {
		window.myjQuery = jQuery.noConflict(true);

		if (typeof jQuery != 'undefined') {
		    console.log("Jira's jQuery version: " + jQuery.fn.jquery);
		    console.log("GTN monkey jQuery version: " + myjQuery.fn.jquery);
		}

		//LOAD SCRIPTS
		loadScript("http://localhost:8080/gtn-monkey.js", () => { 
			loadScript("http://localhost:8080/place-buttons.js")
		})

		var javascripts = Array.from(document.scripts).filter(script => script.type === "text/javascript" ? true : false)
		console.log("Index of loader.js in loaded javascripts: " + findWithAttr(javascripts, "src", "loader.js"))
		console.log("Index of gtn-monkey.js in loaded javascripts: " + findWithAttr(javascripts, "src", "gtn-monkey.js"))
		console.log("Index of place-buttons.js in loaded javascripts: " + findWithAttr(javascripts, "src", "place-buttons.js"))
    })
    
  //   s.onload = function(e)  
    // document.head.appendChild(s);
    // if ($ == undefined || $ !== jQuery) {
    // 	window.$ = jQuery
    // }
}

loadScripts()

