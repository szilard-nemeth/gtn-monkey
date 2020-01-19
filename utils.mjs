import {printLog, printError} from './logging.mjs';
import {GtnMonkeyDataStorage} from './storage.mjs';

const colorLightGreen = "#76D7C4"
const colorGrey = "#BFC9CA"

class LinkUtils {
	//TODO How to simplify? Chaining method calls?
	static findLinksInHtml(html, matchLinksForString) {
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

		if (matchLinksForString) {
			links = links.map(function(link) {
				if (link.indexOf(matchLinksForString) != -1) {
					printLog("Found link matching GTN: " + link)
					return link;
				} else {
					return null
				}
			})
		}

		links = links.filter(function(link) {
		  if (link == null) {
		    return false;
		  }
		  return true;
		})

		return links
	}
}

class ElementUtils {
	static waitForElement(selector, callbacks, count) {
		if (!count) {
			count = 0;
		}
		printLog("Waiting for " + selector + " to disappear... Tried: " + count + " times.")
		if (myjQuery(selector).length == 0) {
			var callbackNames = callbacks.map(c => c.name)
			printLog(`waitForElemenent: Selector: ${selector}, callbacks: ${callbackNames}, count: ${count}`)
			callbacks.forEach(c => c())
		} else {
			setTimeout(function() {
				if (!count) {
					count = 0;
				}
				count++;
				if (count < 10) {
					this.waitForElement(selector, callbacks, count);
				} else { 
					return; 
				}
			}.bind(this), 1000);
		}
	};

	static highlightElements(elementType, type, gtn, available) {
		var color = available ? colorLightGreen : colorGrey
		this.filterJqueryElements(elementType, `${type}-.*-${gtn}`).css("background-color", color);
	}

	//TODO this should be private
	static filterJqueryElements(elementType, regexStr) {
		return $(elementType).filter(function() {
	   		return this.id.match(new RegExp(regexStr));
	  	})
	}
}

class RequestUtils {
	static async requestHttpHead(url = '', method = 'HEAD') {
	  const response = await fetch(url, {
		method: method,
		mode: 'cors',
		cache: 'no-cache',
		credentials: 'same-origin'
	  });
	  return await response 
	}

	static checkURL(url, successCallback, errorCallback) {
		this.requestHttpHead(url).then((response) => {
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
}

export {LinkUtils, ElementUtils, RequestUtils}