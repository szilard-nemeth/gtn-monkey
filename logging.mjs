import {JiraUrlUtils} from './jira.mjs';
import {ScrapeSession} from './scrape-session.mjs';
import * as GtnMonkey from './gtn-monkey.mjs';

export function printLog(message, args) {
	consoleMessage("log", message, args)
}

export function printError(message, args) {
	consoleMessage("error", message, args)
}

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
		return JiraUrlUtils.getJiraName()
	}
}

function getProgress() {
	if (GtnMonkey.SCRAPE_SESSION == null) {
		return "unknown"
	}
	return GtnMonkey.SCRAPE_SESSION.getOverallProgress()
}