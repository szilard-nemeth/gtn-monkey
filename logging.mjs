import {JiraUrlUtils} from './jira.mjs';
import {ScrapeSession} from './scrape-session.mjs';

export function printLog(message, args) {
	consoleMessage("log", message, args)
}

export function printError(message, args) {
	consoleMessage("error", message, args)
}

//TODO decouple 
function consoleMessage(type, message, args) {
	var logPrefix = `GTN monkey (PAGE: ${getPage()}, PROGRESS: ${getProgress()}) `

	if (type === "log") {
		if (args != undefined) {
			console.log(logPrefix + message, args)
		} else {
			console.log(logPrefix + message)
		}
	} else if (type === "error") {
		if (args != undefined) {
			console.error(logPrefix + message, args)
		} else {
			console.error(logPrefix + message)
		}
	} else {
		throw "Unrecognized log method type: " + type
	}
}

function getPage() {
	if (JiraUrlUtils.isOriginPage()) {
		return "ORIGIN: " + JiraUrlUtils.extractJiraPageName()
	} else {
		return getJiraName()
	}
}

function getProgress() {
	return ScrapeSession.getOverallProgress()
}

//TODO duplicated
function getJiraName() {
	return window.location.href.split("browse/")[1]
}