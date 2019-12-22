// ==UserScript==
// @name         GTN monkey
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://jira.cloudera.com/issues/?filter=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var tag = document.createElement("script");
	tag.src = "http://localhost:8080/loader.js"
	document.getElementsByTagName("head")[0].appendChild(tag);
    var scripts = $('script[type="text/javascript"]')
    console.log("Found scripts: ", scripts)
})();
