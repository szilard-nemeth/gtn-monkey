console.log("Loaded gtn-monkey.js")

import {printLog, printError} from './logging.mjs';
import {showResultsButtonSelector, attrDisabled} from './common-constants.mjs';
import {JiraUrlUtils, JiraIssueParser, JiraConstants} from './jira.mjs';
import {ScrapeSession, ScrapeProgress} from './scrape-session.mjs';
import {Storage, StorageKeys} from './storage.mjs';
import * as Overlay from './overlay.mjs';
import {Quanta} from './quanta.mjs';

export var SCRAPE_SESSION;

//ENTRYPOINT: Start up the scraping process
export function findAllLinksFromJiraIssues() {
	if (JiraUrlUtils.isOriginPage() && !SCRAPE_SESSION.isInProgress() && SCRAPE_SESSION.isFinished()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
	}

	//TODO create new ScrapeSession object here, store it as a var
	var jiraFilterName = myjQuery(JiraConstants.JIRA_FILTER_NAME_SELECTOR).text()
	var foundIssues = SCRAPE_SESSION.start(jiraFilterName)
	if (foundIssues) {
		SCRAPE_SESSION.gotoNextPageAtStart()	
	}
}

function onDocumentReady() {
	SCRAPE_SESSION = ScrapeSession.load()
	showOverlay()
	bindEventHandlers()
	setButtonStates()
	printLog("Executed document.ready() on page: " + window.location.href)

	if (SCRAPE_SESSION.isInProgress()) {
		var issues = SCRAPE_SESSION.getDataForJiraIssues()

		//double-check URL
		if (issues && issues.length > 0 && window.location.href === issues[0]) {
			JiraIssueParser.parseGTNLinksFromPage(navigateToNextPageCallback)
		} else if (SCRAPE_SESSION.isFinishedProcessing()) {
			//We got back to the origin page
			//Let's show final results: showResultsOverlay should be executed as progress is finished
			SCRAPE_SESSION.stop()

			//TODO
			//Need to call showOverlay to show latest status
			//showOverlay()
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
	if (SCRAPE_SESSION.isFinished()) {
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
	var jiraData = SCRAPE_SESSION.getJiraDataForJiraIssue(jiraIssue)
	addResultsToTable(jiraData)
	SCRAPE_SESSION.gotoNextPageWhileScraping()
}

export function cleanupStorage() {
	Storage.cleanup()
	enableButton(showResultsButtonSelector, false)
}

export function storeFoundGTNLinksForJiraIssue(newLinks) {
	var jiraIssue = JiraUrlUtils.getJiraName()
	var jiraData = SCRAPE_SESSION.getJiraDataForJiraIssue(jiraIssue)
	SCRAPE_SESSION.storeFoundGTNLinks(jiraIssue, jiraData, newLinks)
}

//TODO move this to utils.mjs
function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function addResultsToTable(jiraData) {
	Overlay.appendRowToResultTable(jiraData)
}

export function checkIfQuantaLinksAreAccessible() {
	var allJiraData = SCRAPE_SESSION.getAllJiraData()
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
	var numberOfFoundIssues = SCRAPE_SESSION.getNumberOfFoundJiraIssues()
	var allJiraData = SCRAPE_SESSION.getAllJiraData()
	Overlay.renderResults(numberOfFoundIssues, allJiraData)
	if (SCRAPE_SESSION.isInProgress() || SCRAPE_SESSION.isFinishedRecently()) {
		Overlay.showResults()
	}
}


//==============================================================
//On page ready
myjQuery(document).ready(function() {
	onDocumentReady()
});
