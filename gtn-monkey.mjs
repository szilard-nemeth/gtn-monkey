console.log("Loaded gtn-monkey.js")

import {printLog, printError} from './logging.mjs';
import {showResultsButtonSelector, attrDisabled} from './common-constants.mjs';
import {JiraUrlUtils, JiraIssueParser} from './jira.mjs';
import {ScrapeSession} from './scrape-session.mjs';
import {Storage, GtnMonkeyDataStorage} from './storage.mjs';
import * as Overlay from './overlay.mjs';
import {Quanta} from './quanta.mjs';


//TODO make class: Navigation

//ENTRYPOINT: Start up the scraping process
export function findAllLinksFromJiraIssues() {
	if (JiraUrlUtils.isOriginPage() && !ScrapeSession.isInProgress() && ScrapeSession.isFinished()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
	}

	ScrapeSession.start()
	ScrapeSession.storeOriginPage()
	
	var issues = GtnMonkeyDataStorage.storeFoundJiraIssues()
	if (!issues || issues.length == 0) {
		printLog("NO JIRA ISSUES FOUND IN CURRENT PAGE!")
		return
	}
	gotoNextPage(Storage.getFoundJiraIssues())
}

function onDocumentReady() {
	bindEventHandlers()
	setButtonStates()
	printLog("Executed document.ready() on page: " + window.location.href)

	if (ScrapeSession.isInProgress()) {
		var issues = Storage.getFoundJiraIssues()
		printLog("Retrieved jira issues from storage: " + issues)

		//double-check URL
		if (issues && issues.length > 0 && window.location.href === issues[0]) {
			JiraIssueParser.parseGTNLinksFromPage(navigateToNextPageCallback)
		} else if (location == Storage.getOriginPage() && ScrapeSession.isInProgress()) {
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
	addResultsToTable()
	var issues = Storage.getFoundJiraIssues()
	var parsedPage = issues.shift()
	printLog("Parsed GTN links from current page")
	//store modified jira issues array to Storage so next execution of onDocumentReady() picks up next page
	GtnMonkeyDataStorage.storeFoundJiraIssues(issues)

	//Navigate to next page
	if (issues.length > 0) {
		gotoNextPage(issues)
	} else {
		printLog("No more pages to process. Changing location to origin jira URL: " + Storage.getOriginPage())
		gotoOriginPage()
	}
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

function gotoNextPage(issues) {
	changeLocation(issues[0])
}

function gotoOriginPage() {
	changeLocation(Storage.getOriginPage())
}

function changeLocation(location) {
	var origin = Storage.getOriginPage()
	if (location !== origin) {
		ScrapeSession.processNextPage()
	}
	printLog("Changing location to: " + location)
	window.location.href = location
}

//TODO move this to utils.mjs
function isFunction(functionToCheck) {
	return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

//===============================
//On page ready
myjQuery(document).ready(function() {
	onDocumentReady()
});

function addResultsToTable() {
	var jiraIssue = JiraUrlUtils.getJiraName()
	var jiraData = GtnMonkeyDataStorage.getStoredJiraDataForIssue(jiraIssue)
	Overlay.appendRowToResultTable(jiraData)
}

export function checkIfQuantaLinksAreAccessible() {
	Quanta.checkLinks()
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

Overlay.renderResults()
if (ScrapeSession.isInProgress() || ScrapeSession.isFinishedJustNow()) {
	Overlay.showResults()
}