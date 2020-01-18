console.log("Loaded gtn-monkey.js")

import {printLog, printError} from './logging.mjs';
import {showResultsButtonSelector, attrDisabled, gtnQueryParam} from './common-constants.mjs';
import * as MapUtils from './maputils.mjs';
import {JiraUrlUtils, JiraIssueParser} from './jira.mjs';
import {ScrapeSession} from './scrape-session.mjs';
import {Storage} from './storage.mjs';
import * as Overlay from './overlay.mjs';

//STRING CONSTANTS
//==========================================

//Quanta specific constants
//==========================================
const QUANTA_URL_VPN_CHECK = "https://quanta.infra.cloudera.com"
const gtnPlaceholder = "$GTN$"
const quantaTemplate = `http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/${gtnPlaceholder}/QUASAR_ZIP_FOLDER/`
//URL example: http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/1681945/QUASAR_ZIP_FOLDER/QUASAR_TEST_LOGS.zip

const quantaTestLogsFilename = "QUASAR_TEST_LOGS.zip"
const quantaDiagBundleFilename = "QUASAR_DIAG_LOGS.zip"
const testLogsTemplate = quantaTemplate + quantaTestLogsFilename
const diagBundleTemplate = quantaTemplate + quantaDiagBundleFilename

const quantaUrlSplitAlong = "/s3/quanta/"
const urlFragmentTestLogs = "TEST_LOGS"
const urlFragmentDiagBundle = "DIAG_LOGS"

//GTN Monkey constants
//==========================================

//others
const colorLightGreen = "#76D7C4"
const colorGrey = "#BFC9CA"

const jiraSummarySelector = '#summary-val'
const jiraIssuesOnFilterPageSelector = '.results-panel .issuekey a'
//End of constants
//==========================================

class JiraData {
  constructor(id, title, links) {    
    this.id = id;
    this.title = title;

    if (links == null || links == undefined) {
    	links = []
    }

    //TODO do this conversion earlier?
    this.links = links.reduce(function(map, link) {
		var gtn = link.split(gtnQueryParam)[1]

		//If we have anything after GTN number, drop it
		gtn = gtn.match(/^\d+/gi)
		
		if (gtn == undefined || gtn == null) {
			throw "GTN is not valid for link: " + link
		}
    	
    	map.set(gtn, { 
    		quantaLink: link,
    		quantaTestLog: testLogsTemplate.replace(gtnPlaceholder, gtn),
    		quantaDiagBundle: diagBundleTemplate.replace(gtnPlaceholder, gtn),
    		quantaTestLogDownloadName: `${this.id}-${gtn}-${quantaTestLogsFilename}`,
    		quantaDiagBundleDownloadName: `${this.id}-${gtn}-${quantaDiagBundleFilename}`
    	});
    	return map;
	}.bind(this), new Map());
	console.log("LINKZ: ")
  }
}


//Collection of in-memory JiraData objects
var JIRADATA_LIST = []

//ENTRYPOINT: Start up the scraping process
export function findAllLinksFromJiraIssues() {
	if (JiraUrlUtils.isOriginPage() && !ScrapeSession.isInProgress() && ScrapeSession.isFinished()) {
		printLog("We are on origin page, cleaning up storage...")
		cleanupStorage()
	}

	ScrapeSession.start()
	ScrapeSession.storeOriginPage()
	
	var issues = storeFoundJiraIssues()
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
			ScrapeSession.stopProgress()
			checkIfQuantaLinksAreAccessible()
		} else {
			console.error("window.location.href != issues[0]. current page: " + window.location.href + " issues[0]: " + issues[0])
		}
	}
}

function bindEventHandlers() {
	myjQuery(document).keyup(function(e) {
		//Hide overlay and dialog on pressing ESC
		if (e.keyCode === 27) {
			Overlay.closeResults()
		}
	});
}

function setButtonStates() {
	//TODO this should only depend on if any results are stored in localstorage, not ScrapeSession
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
	//store modified jira issues array to localStorage so next execution of onDocumentReady() picks up next page
	storeFoundJiraIssues(issues)

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
	var jiraData = getStoredJiraDataForIssue(jiraIssue)
	storeFoundGTNLinks(jiraIssue, jiraData, newLinks)
}

function storeFoundGTNLinks(jiraIssue, jiraData, newLinks) {
	if (jiraData.links > 0) {
		printLog("Found data for '" + jiraIssue + "', appending data to it")
	}
	printLog("Found new GTN links: " + JSON.stringify(newLinks))
	var linksArray = Array.from(jiraData.links.values()).map(val => val.quantaLink).concat(newLinks)
	printLog("Updated links: " + JSON.stringify(linksArray))

	var jiraTitle = myjQuery(jiraSummarySelector).text()
	
	//create JiraData
	var data = new JiraData(jiraIssue, jiraTitle, linksArray)
	printLog("Storing modified JiraData: " + JSON.stringify(data))

	//update JiraData array and store it to localStorage
	var allJiraData = deserializeAllJiraData()
	var foundJiraData = getJiraData(allJiraData, jiraIssue, false)
	if (foundJiraData != null) {
		printLog(`Replacing found jiraData: ${JSON.stringify(foundJiraData)} with new JiraData: ${JSON.stringify(data)}`)
		// var idx = allJiraData.indexOf(foundJiraData)
		// allJiraData[idx] = data
		foundJiraData.links = data.links
	} else {
		allJiraData.push(data)
	}
	
	//Convert Map before calling JSON.stringify as Maps are not serializable
	allJiraData.forEach(jd => jd.links = MapUtils.strMapToObj(jd.links))
	Storage.storeJiraDataObjs(allJiraData)
}

function storeFoundJiraIssues(jiraIssues) {
	var issueLinks
	if (jiraIssues === undefined) {
		issueLinks = myjQuery(jiraIssuesOnFilterPageSelector).map(function() {
			return JiraUrlUtils.getServerPrefixedUrl(myjQuery(this).attr('href'))
		}).toArray();
		printLog("Found jira issues on origin (filter) page: " + issueLinks.toString())

		//Only store number of jira issues if this is the initial run
		Storage.storeNumberOfJiraIssuesFound(issueLinks.length)
	} else {
		printLog("Storing jira issues: " + jiraIssues.toString())
		issueLinks = jiraIssues
	}
	Storage.storeJiraIssuesFound(issueLinks)

	return issueLinks
}

function getStoredJiraDataForIssue(jiraIssue) {
	var allJiraData = deserializeAllJiraData()
	return getJiraData(allJiraData, jiraIssue)
}

//TODO can be removed later
function getJiraData(allJiraData, jiraIssueId, create = true) {
	var found = allJiraData.find(jd => jd.id === jiraIssueId);
	if (found != undefined && found != null) {
		return found
	}
	if (create) {
		return new JiraData(null, null, [])	
	} else {
		return null
	}
}

export function deserializeAllJiraData() {
	var allJiraDataObj = Storage.getJiraDataObjs();
	return allJiraDataObj.map(jiraData => {
		jiraData = Object.assign(new JiraData(null, null, []), jiraData)
		if (!(jiraData.links instanceof Map)) {
			// jiraData.links = new Map(Object.entries(jiraData.links));
			jiraData.links = MapUtils.objToStrMap(jiraData.links)
			//jiraData.links = JSON.parse(JSON.stringify(jiraData.links)).reduce((m, [key, val]) => m.set(key, val) , new Map());
		}
		printLog("Deserialized JiraData: " + JSON.stringify(jiraData))
		return jiraData
	})
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
		ScrapeSession.storeProgress()
	}
	printLog("Changing location to: " + location)
	window.location.href = location
}

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
	var jiraData = getStoredJiraDataForIssue(jiraIssue)
	Overlay.appendRowToResultTable(jiraData)
}

function filterJqueryElements(elementType, regexStr) {
	return $(elementType).filter(function() {
   		return this.id.match(new RegExp(regexStr));
  	})
}

export function checkIfQuantaLinksAreAccessible() {
	function extractGtnFromURL(url) {
		if (url.indexOf(quantaUrlSplitAlong) != -1) {
			return url.split(quantaUrlSplitAlong)[1].split('/')[0]
		} else {
			console.error(`Unexpected URL, URL should contain '${quantaUrlSplitAlong}'. Got URL: ${resonse.url}`)
		}
	}

	function highlightElements(elementType, type, gtn, available) {
		var color = available ? colorLightGreen : colorGrey
		filterJqueryElements(elementType, `${type}-.*-${gtn}`).css("background-color", color);
	}

	function handleQuantaFetchResult(url, result) {
		//result: boolean
		var gtn = extractGtnFromURL(url)
		if (url.indexOf(urlFragmentTestLogs) != -1) {
			highlightElements("p", Overlay.quantaTestLogParagraphIdPrefix, gtn, result)	
		} else if (url.indexOf(urlFragmentDiagBundle) != -1) {
			highlightElements("p", Overlay.quantaBundleParagraphIdPrefix, gtn, result)
		}
	}

	function checkLinks() {
		allJiraData.forEach(jd => {
			jd.links.forEach((value, key, map) => {
				validateQuantaURL(map.get(key).quantaTestLog, handleQuantaFetchResult)
				validateQuantaURL(map.get(key).quantaDiagBundle, handleQuantaFetchResult)
				})
			})
	}

	var allJiraData = deserializeAllJiraData()
	checkURL(CORS_ANYWHERE_SERVER_URL, () => { //successcallback

		//Perform VPN check
		validateQuantaURL(QUANTA_URL_VPN_CHECK, () => {
			checkLinks()
		}, () => {
			printError("QUANTA IS NOT AVAILABLE! PLEASE MAKE SURE YOU ARE CONNECTED TO VPN!")
			//TODO Only run this if bypass-VPN check checkbox is ticked 
			//checkLinks()
		})
		
		}, () => { //errorcallback
			printError("CORS-ANYWHERE SERVER IS NOT AVAILABLE!")
		}
	)
}

async function getURL(url = '', method = 'HEAD') {
  const response = await fetch(url, {
	method: method,
	mode: 'cors',
	cache: 'no-cache',
	credentials: 'same-origin'
  });
  return await response 
}

function getQuantaURL(url) {
	return getURL(`${CORS_ANYWHERE_SERVER_URL}/${url}`, "GET")
}

function validateQuantaURL(url, successCallback, errorCallback) {
	getURL(`${CORS_ANYWHERE_SERVER_URL}/${url}`).then((response) => {
    	printLog(`Request result:: URL: ${response.url}, response OK: ${response.ok}, response status: ${response.status}`)
    	
    	if (response.ok && response.status == 200) {
    		printLog(`Quanta link ${response.url} is valid and reachable.`)
    	} else if (response.status == 404) {
    		printLog(`Quanta Link ${response.url}  is expired, got HTTP status ${response.status}!`)
    	} else {
    		printLog(`Cannot access Quanta link ${response.url}, got HTTP status: ${response.status}!`)
    	}

    	if (response.status == 200 || response.status == 404) {
    		printLog("Calling callback function...")
    		successCallback(response.url, response.status == 200 ? true : false)
    	}
  	}).catch(function (error) {
    	printError('Request failed', error);
    	//TODO
    	// errorCallback(response.url, response.status)
    	printError("Error while calling validateQuantaURL!, error: " + error)
    	if (errorCallback != undefined) {
    		errorCallback(error)	
    	}
	});
}

function checkURL(url, successCallback, errorCallback) {
	getURL(url).then((response) => {
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