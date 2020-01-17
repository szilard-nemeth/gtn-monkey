import {JiraUrlUtils} from './jira.mjs';
import {ScrapeSession} from './scrape-session.mjs';

export function printLog(message) {
	consoleMessage("log", message)
}

export function printError(message) {
	consoleMessage("error", message)
}

//TODO decouple 
function consoleMessage(type, message) {
	var logPrefix = `GTN monkey (PAGE: ${getPage()}, PROGRESS: ${getProgress()}) `

	if (type === "log") {
		console.log(logPrefix + message)	
	} else if (type === "error") {
		console.error(logPrefix + message)
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