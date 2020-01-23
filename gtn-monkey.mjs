console.log("Loaded gtn-monkey.js")

import {printLog, printError} from './logging.mjs';
import {showResultsButtonSelector, attrDisabled} from './common-constants.mjs';
import {JiraUrlUtils, JiraIssueParser, JiraConstants} from './jira.mjs';
import {ScrapeSession, ScrapeProgress} from './scrape-session.mjs';
import {Storage, GtnMonkeyDataStorage, StorageKeys} from './storage.mjs';
import * as Overlay from './overlay.mjs';
import {Quanta} from './quanta.mjs';

export var SCRAPE_SESSION;

//ENTRYPOINT: Start up the scraping process
export function findAllLinksFromJiraIssues() {
	if (JiraUrlUtils.isOriginPage() && !ScrapeSession.isInProgress() && ScrapeSession.isFinished()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
	}

	//TODO create new ScrapeSession object here, store it as a var
	var jiraFilterName = myjQuery(JiraConstants.JIRA_FILTER_NAME_SELECTOR).text()
	var foundIssues = ScrapeSession.start(jiraFilterName)
	if (foundIssues) {
		ScrapeSession.gotoNextPageAtStart()	
	}
}

function onDocumentReady() {
	//TODO workaround
	if (ScrapeSession.progress == null) {
		//TODO deserialize progress
		var progress = Storage.deserializeObject(StorageKeys.PROGRESS_OBJ, ScrapeProgress)
		if (progress != null) {
			ScrapeSession.progress = progress	
		} else {
			ScrapeSession.progress = new ScrapeProgress()	
		}
	}

	//TODO deserialize all GTN monkey data here and store it into a global var so logging can access it!
	// SCRAPE_SESSION = new ScrapeSession()
	//Show overlay everytime a page loads
	showOverlay()

	bindEventHandlers()
	setButtonStates()
	printLog("Executed document.ready() on page: " + window.location.href)

	if (ScrapeSession.isInProgress()) {
		var issues = ScrapeSession.getDataForJiraIssues()

		//double-check URL
		if (issues && issues.length > 0 && window.location.href === issues[0]) {
			JiraIssueParser.parseGTNLinksFromPage(navigateToNextPageCallback)
		} else if (ScrapeSession.isFinishedProcessing()) {
			//We got back to the origin page
			//Let's show final results: showResultsOverlay should be executed as progress is finished
			ScrapeSession.stop()
			checkIfQuantaLinksAreAccessible()
		} else {
			console.error("window.location.href != issues[0]. current page: " + window.location.href + " issues[0]: " + issues[0])
		}
	}
}

//TODO move this to utils.mjs
function bindEventHandlers() {
	myjQuery(document).keyup(function(e) {
		//Hide overlay and dialog on pressing ESC
		if (e.keyCode === 27) {
			Overlay.closeResults()
		}
	});
}

function setButtonStates() {
	//TODO this should only depend on if any results are stored in Storage, not ScrapeSession
	if (ScrapeSession.isFinished()) {
		enableButton(showResultsButtonSelector, true)
	} else {
		enableButton(showResultsButtonSelector, false)
	}
}

function enableButton(buttonSelector, enabled) {
	myjQuery(buttonSelector).attr(attrDisabled, !enabled);
}

//TODO: move this
//Exported for place-buttons.mjs
export function showResultsOverlay() {
	Overlay.showResults()
}

function navigateToNextPageCallback() {
	var jiraIssue = JiraUrlUtils.getJiraName()
	var jiraData = ScrapeSession.getDataForJiraIssue(jiraIssue)
	addResultsToTable(jiraData)
	ScrapeSession.gotoNextPageWhileScraping()
}

export function cleanupStorage() {
	Storage.cleanup()
	enableButton(showResultsButtonSelector, false)
}

export function storeFoundGTNLinksForJiraIssue(newLinks) {
	var jiraIssue = JiraUrlUtils.getJiraName()
	var jiraData = GtnMonkeyDataStorage.getStoredJiraDataForIssue(jiraIssue)
	GtnMonkeyDataStorage.storeFoundGTNLinks(jiraIssue, jiraData, newLinks)
}

//TODO move this to utils.mjs
function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function addResultsToTable(jiraData) {
	Overlay.appendRowToResultTable(jiraData)
}

export function checkIfQuantaLinksAreAccessible() {
	var allJiraData = GtnMonkeyDataStorage.deserializeAllJiraData()
	Quanta.checkLinks(allJiraData)
}

//TODO move this to utils.mjs
function copyText(str) {
	const el = document.createElement('textarea');
	el.value = str;
	el.setAttribute('readonly', '');
	el.style.position = 'absolute';
	el.style.left = '-9999px';
	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
}

function showOverlay() {
	var numberOfFoundIssues = GtnMonkeyDataStorage.getNumberOfFoundJiraIssues()
	var allJiraData = GtnMonkeyDataStorage.deserializeAllJiraData()
	Overlay.renderResults(numberOfFoundIssues, allJiraData)
	if (ScrapeSession.isInProgress() || ScrapeSession.isFinishedJustNow()) {
		Overlay.showResults()
	}
}


//==============================================================
//On page ready
myjQuery(document).ready(function() {
	onDocumentReady()
});
