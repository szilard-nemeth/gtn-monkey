import {Storage, StorageKeys, JiraData} from './storage.mjs';
import {ScrapeProgress} from './scrape-progress.mjs';
import {printLog, printError} from './logging.mjs';
import * as MapUtils from './maputils.mjs';
import * as Navigation from './navigation.mjs';
import {JiraIssueParser, JiraUrlUtils} from './jira.mjs';

class ScrapeSession {
	jiraFilter;
	originPage;
	progress;
	jiraIssueLinks;
	jiraData;
	numberOfIssuesFound;
	currentPageIdx;

	constructor() {
		this.progress = new ScrapeProgress()
		this.jiraData = []
		this.currentPageIdx = 0
	}

  	static load() {
  		printLog("Loading ScrapeSession data from storage...")
  		var session = Storage.deserializeObject(StorageKeys.SCRAPE_SESSION_OBJ, ScrapeSession)
  		session.jiraData = this.deserializeJiraData(session.jiraData)
		session.progress = Object.assign(new ScrapeProgress(), session.progress)
  		return session
  	}

	//private
	static deserializeJiraData(jiraDataObjs) {
		if (jiraDataObjs == undefined || jiraDataObjs == null) {
			jiraDataObjs = []
		}

		return jiraDataObjs.map(jiraData => {
			jiraData = Object.assign(new JiraData(null, null, []), jiraData)
			if (!(jiraData.links instanceof Map)) {
				jiraData.links = MapUtils.objToStrMap(jiraData.links)
			}
			printLog("Deserialized JiraData: " + JSON.stringify(jiraData))
			return jiraData
		})
	}

	serialize() {
		//Convert Map before calling Storage method as Maps are not serializable
		this.jiraData.forEach(jd => jd.links = MapUtils.strMapToObj(jd.links))
		this.currentPageIdx += 1
		Storage.serializeObject(StorageKeys.SCRAPE_SESSION_OBJ, this)
		//TODO seems like a hack: better to make a copy of this and serialize that, and keep scrapesession as it is (https://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object)
		this.jiraData = ScrapeSession.load().jiraData
	}

	start(jiraFilterName) {
		this.jiraFilter = jiraFilterName
		this.originPage = window.location.href
		this.progress.startProgress()

		this.storeFoundJiraIssues()
		if (!this.jiraIssueLinks || this.jiraIssueLinks.length == 0) {
			printLog("NO JIRA ISSUES FOUND IN CURRENT PAGE!")
			return false
		}
		printLog("Stored originPage: " + this.originPage)
		return true
	}

	storeFoundJiraIssues(jiraIssues) {
		var issueLinks

		//initial run
		if (jiraIssues === undefined) {
			issueLinks = JiraIssueParser.parseJiraIssues()
			printLog("Found jira issues on origin (filter) page: " + issueLinks.toString())

			//Only store number of jira issues if this is the initial run
			this.numberOfIssuesFound = issueLinks.length
		} else {
			printLog("Storing jira issues: " + jiraIssues.toString())
			issueLinks = jiraIssues
		}
		this.jiraIssueLinks = issueLinks
	}

	storeFoundGTNLinks(jiraIssue, jiraData, jiraTitle, newLinks) {
		if (jiraData.links.size > 0) {
			printLog("Found data for '" + jiraIssue + "', appending data to it")
		}
		printLog("Found new GTN links: " + JSON.stringify(newLinks))
		var linksArray = Array.from(jiraData.links.values()).map(val => val.quantaLink).concat(newLinks)
		printLog("Updated links: " + JSON.stringify(linksArray))
		
		//create JiraData
		var data = new JiraData(jiraIssue, jiraTitle, linksArray)
		printLog("Storing modified JiraData: " + JSON.stringify(data))

		//update JiraData array and store it
		var allJiraData = this.jiraData
		var foundJiraData = this.getJiraData(allJiraData, jiraIssue, false)
		if (foundJiraData != null) {
			printLog(`Replacing found jiraData: ${JSON.stringify(foundJiraData)} with new JiraData: ${JSON.stringify(data)}`)
			// var idx = allJiraData.indexOf(foundJiraData)
			// allJiraData[idx] = data
			foundJiraData.links = data.links
		} else {
			allJiraData.push(data)
		}
		
		this.jiraData = allJiraData
	}

	processNextPage() {
		var jiraIssue = JiraUrlUtils.getJiraName(this.getNextPage())
		var numberOfFoundIssues = this.getNumberOfFoundJiraIssues()
		this.progress.storeProgress(jiraIssue, numberOfFoundIssues)
		this.serialize()
	}
	
	isInProgress() {
		return this.progress.isInProgress()
	}

	stop() {
		this.progress.stopProgress()
		this.serialize()
	}

	getOverallProgress() {
		return this.progress.getOverallProgress(this)
	}

	isFinished() {
		return this.progress.isFinished()
	}

	isFinishedRecently() {
		return this.progress.isFinishedRecently()
	}

	isFinishedProcessing() {
		return window.location.href == this.getOriginPage() && this.isInProgress()
	}

	getNextPage() {
		return this.getFoundJiraIssues()[this.currentPageIdx]
	}

	getCurrentPage() {
		if (this.currentPageIdx == 0) {
			throw "Should not be called if no page was processed!"
		}
		return this.getFoundJiraIssues()[this.currentPageIdx - 1]
	}

	hasMorePages() {
		return this.currentPageIdx < this.getFoundJiraIssues().length 
	}

	gotoNextPage(page) {
		if (this.hasMorePages()) {
			Navigation.navigate(this.getNextPage(), this)
		} else {
			var originPage = this.getOriginPage()
			printLog("No more pages to process. Navigating to origin page: " + originPage)
			Navigation.navigate(originPage, this)
		}
	}

	getFilterName() {
		return this.jiraFilter
	}

	getOriginPage() {
		return this.originPage
	}

	getNumberOfFoundJiraIssues() {
		return this.numberOfIssuesFound
	}

	getFoundJiraIssues() {
		if (!this.jiraIssueLinks) {
			return []
		}
		return this.jiraIssueLinks
	}

	getJiraDataForJiraIssue(jiraIssue) {
		return this.getJiraData(this.jiraData, jiraIssue)
	}

	//TODO can be removed later (probably)
	getJiraData(allJiraData, jiraIssueId, create = true) {
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

	getAllJiraData() {
		return this.jiraData
	}

}

export { ScrapeSession };