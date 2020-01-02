function loadScript(src) {
	var tag = document.createElement("script");
	tag.src = src;
	document.getElementsByTagName("head")[0].appendChild(tag);
}

console.log("Loaded loader....")


function importJquery() {
    //https://www.quora.com/How-can-I-import-JQuery-into-my-js-file
    var s = document.createElement("script");
    // s.src = "https://code.jquery.com/jquery-3.4.1.min.js";
    s.src = "https://code.jquery.com/jquery-1.7.2.min.js";
    s.onload = function(e) { 
    	window.myjQuery = jQuery.noConflict(true);

    	if (typeof jQuery != 'undefined') {
		    console.log("Jira's jQuery version: " + jQuery.fn.jquery);
		    console.log("GTN monkey jQuery version: " + myjQuery.fn.jquery);
		}

    	//LOAD SCRIPTS
		loadScript("http://localhost:8080/gtn-monkey.js")
		loadScript("http://localhost:8080/place-buttons.js")
    }; 
    document.head.appendChild(s);
    // if ($ == undefined || $ !== jQuery) {
    // 	window.$ = jQuery
    // }
}

importJquery()