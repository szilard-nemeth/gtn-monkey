import {printLog, printError} from './logging.mjs';

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
}

export {LinkUtils, ElementUtils}