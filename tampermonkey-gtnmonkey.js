// ==UserScript==
// @name         GTN monkey
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Trying to desperately find all GTNs for systest failures :)
// @author       You
// @match        https://jira.cloudera.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
	console.log("Loaded GTN Monkey userscript")
    'use strict';
    var script = document.createElement("script");
    script.type = "text/javascript"
	script.src = "http://localhost:8080/loader.js"
	document.getElementsByTagName("head")[0].insertAdjacentElement('afterbegin', script)

	//If @run-at is 'document-start', we can't assume jQuery is available at this point!
    // var scripts = $('script[type="text/javascript"]')
    // console.log("Found scripts: ", scripts)
})();
