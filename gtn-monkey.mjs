console.log("Loaded gtn-monkey.js")

import {printLog, printError} from './logging.mjs';
import {showResultsButtonSelector, attrDisabled} from './common-constants.mjs';
import {JiraUrlUtils, JiraIssueParser, JiraConstants} from './jira.mjs';
import {ScrapeSession} from './scrape-session.mjs';
import {Storage, StorageKeys} from './storage.mjs';
import * as Overlay from './overlay.mjs';
import {Quanta} from './quanta.mjs';
import * as Utils from './utils.mjs';

export var SCRAPE_SESSION;

//ENTRYPOINT: Start up the scraping process
export function findAllLinksFromJiraIssues() {
	if (JiraUrlUtils.isOriginPage() && !SCRAPE_SESSION.isInProgress() && SCRAPE_SESSION.isFinished()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
		SCRAPE_SESSION = new ScrapeSession()
	}

	var jiraFilterName = myjQuery(JiraConstants.JIRA_FILTER_NAME_SELECTOR).text()
	var foundIssues = SCRAPE_SESSION.start(jiraFilterName)
	if (foundIssues) {
		SCRAPE_SESSION.gotoNextPageAtStart()	
	}
}

function onDocumentReady() {
	SCRAPE_SESSION = ScrapeSession.load()
	showOverlay()
	Utils.bindEventHandlers()
	setButtonStates()
	printLog("Executed document.ready() on page: " + window.location.href)

	if (SCRAPE_SESSION.isInProgress()) {
		//double-check URL
		if (window.location.href === SCRAPE_SESSION.getCurrentPage()) {
			JiraIssueParser.parseGTNLinksFromPage(navigateToNextPageCallback)
		} else if (SCRAPE_SESSION.isFinishedProcessing()) {
			//We got back to the origin page
			SCRAPE_SESSION.stop()

			//TODO Need to call showOverlay to show latest status
			//showOverlay()
			checkIfQuantaLinksAreAccessible()
		} else {
			console.error(`Current URL != Expected URL. Current page: ${window.location.href}, Expected page: ${SCRAPE_SESSION.getCurrentPage()}`)
		}
	}
}

function setButtonStates() {
	if (SCRAPE_SESSION.isFinished()) {
		enableButton(showResultsButtonSelector, true)
	} else {
		enableButton(showResultsButtonSelector, false)
	}
}

function enableButton(buttonSelector, enabled) {
	myjQuery(buttonSelector).attr(attrDisabled, !enabled);
}

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
	var jiraTitle = JiraIssueParser.parseTitle()
	SCRAPE_SESSION.storeFoundGTNLinks(jiraIssue, jiraData, jiraTitle, newLinks)
}

function addResultsToTable(jiraData) {
	Overlay.appendRowToResultTable(jiraData)
}

export function checkIfQuantaLinksAreAccessible() {
	var allJiraData = SCRAPE_SESSION.getAllJiraData()
	Quanta.checkLinks(allJiraData)
}

function showOverlay() {
	var numberOfFoundIssues = SCRAPE_SESSION.getNumberOfFoundJiraIssues()
	var allJiraData = SCRAPE_SESSION.getAllJiraData()
	var progress = SCRAPE_SESSION.getOverallProgress()
	Overlay.renderResults(numberOfFoundIssues, allJiraData, progress, checkIfQuantaLinksAreAccessible)
	if (SCRAPE_SESSION.isInProgress() || SCRAPE_SESSION.isFinishedRecently()) {
		Overlay.showResults()
	}
}


//==============================================================
//On page ready
myjQuery(document).ready(function() {
	onDocumentReady()
});
