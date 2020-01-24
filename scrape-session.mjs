import {Storage, StorageKeys, JiraData} from './storage.mjs';
import {JiraUrlUtils} from './jira.mjs';
import {printLog, printError} from './logging.mjs';
import * as MapUtils from './maputils.mjs';


//TODO make Progress class to decouple progress
//progress
export const PROGRESS_FINISHED = "Finished"
export const PROGRESS_STARTED = "Started"

//TODO make this an object and only store state through instance of this class
//TODO remove all references to myjQuery

//TODO move these to somewhere else? Feels like these belong to jira.mjs?
const jiraSummarySelector = '#summary-val'
const jiraIssuesOnFilterPageSelector = '.results-panel .issuekey a'

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
  		var session = Storage.deserializeObject(StorageKeys.SCRAPE_SESSION_OBJ, ScrapeSession)
  		session.jiraData = this.deserializeJiraData(session.jiraData)

  		//TODO simplify this
  		if (session.progress == null) {
			var progress = Storage.deserializeObject(StorageKeys.PROGRESS_OBJ, ScrapeProgress)
			if (session.progress != null) {
				session.progress = progress
			} else {
				session.progress = new ScrapeProgress()	
			}
  		} else {
  			session.progress = Object.assign(new ScrapeProgress(), session.progress)
  		}
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
				// jiraData.links = new Map(Object.entries(jiraData.links));
				jiraData.links = MapUtils.objToStrMap(jiraData.links)
				//jiraData.links = JSON.parse(JSON.stringify(jiraData.links)).reduce((m, [key, val]) => m.set(key, val) , new Map());
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
		this.progress.storeProgress(PROGRESS_STARTED, this)

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
			issueLinks = myjQuery(jiraIssuesOnFilterPageSelector).map(function() {
				return JiraUrlUtils.getServerPrefixedUrl(myjQuery(this).attr('href'))
			}).toArray();
			printLog("Found jira issues on origin (filter) page: " + issueLinks.toString())

			//Only store number of jira issues if this is the initial run
			this.numberOfIssuesFound = issueLinks.length
		} else {
			printLog("Storing jira issues: " + jiraIssues.toString())
			issueLinks = jiraIssues
		}
		this.jiraIssueLinks = issueLinks
	}

	storeFoundGTNLinks(jiraIssue, jiraData, newLinks) {
		if (jiraData.links.size > 0) {
			printLog("Found data for '" + jiraIssue + "', appending data to it")
		}
		printLog("Found new GTN links: " + JSON.stringify(newLinks))
		var linksArray = Array.from(jiraData.links.values()).map(val => val.quantaLink).concat(newLinks)
		printLog("Updated links: " + JSON.stringify(linksArray))

		var jiraTitle = myjQuery(jiraSummarySelector).text()
		
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
		this.progress.storeProgress(null, this)
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

	gotoNextPageAtStart() {
		Navigation.navigate(this.getNextPage(), this)
	}

	gotoNextPageWhileScraping(page) {
		//TODO no need to re-store data, don't delete source issue links array, just store current index!
		var jiraIssueLinks = this.getFoundJiraIssues()
		var nextPage = this.getNextPage()
		printLog("Parsed GTN links from current page")
		//store modified jira issues array to Storage so next execution of onDocumentReady() picks up next page
		this.storeFoundJiraIssues(jiraIssueLinks)

		//Navigate to next page
		if (this.hasMorePages()) {
			Navigation.navigate(nextPage, this)
		} else {
			//Navigate to origin page
			var originPage = this.getOriginPage()
			printLog("No more pages to process. Changing location to origin jira URL: " + originPage)
			Navigation.navigate(originPage, this)
		}
	}

	//TODO these static methods are temporarily added
	//used from ScrapeSession
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

class ScrapeProgress {
	//Can be STARTED, FINISHED or a number (e.g. 2) indicating number of processed items
	state = null;
	progressStr = "";
	finishedTime = null;

	storeProgress(state, session) {
		if (state != undefined || state != null) {
			this.state = state
		}

		if (state == PROGRESS_STARTED) {
			//Don't increase progress counter if just started
			return
		}

		var prevProgress = this.state

		var progressCounter
		if (prevProgress == null || prevProgress === PROGRESS_STARTED) {
			progressCounter = 1
		} else {
			progressCounter = parseInt(prevProgress, 10) + 1
		}

		var jiraIssue = JiraUrlUtils.getJiraName(session.getNextPage())
		var numberOfFoundIssues = session.getNumberOfFoundJiraIssues()
		this.state = progressCounter
		this.progressStr = `${progressCounter} / ${numberOfFoundIssues} (Jira: ${jiraIssue})`
		printLog("Saved progress: " + progressCounter)
	}

	isInProgress() {
		if (this.state == null || this.state === PROGRESS_FINISHED) {
			return false
		}
		return true
	}

	stopProgress() {
		this.state = PROGRESS_FINISHED
		//TODO add to progressStr: how many items were processed in this session, e.g. (24/24)
		this.progressStr = PROGRESS_FINISHED
		this.finishedTime = Date.now()
		printLog("Stopped progress")
	}

	getOverallProgress(session) {
		if (this.progressStr && this.progressStr != null) {
			if (this.progressStr === PROGRESS_FINISHED) {
				return `Finished processing Jira filter '${session.getFilterName()}' with ${session.getNumberOfFoundJiraIssues()} items`
			} else {
				return `Processing Jira filter '${session.getFilterName()}': ${this.progressStr}`		
			}
		}
		return "Unknown progress"
	}

	isFinished() {
		if (this.state === PROGRESS_FINISHED) {
			return true
		}
		return false
	}

	isFinishedRecently() {
		if (!this.isFinished()) {
			return false
		}

		var now = Date.now()
		if (now - this.finishedTime <= 10000) {
			return true
		}
		return false
	}
}

class Navigation {
	static navigate(location, session) {
		var origin = session.getOriginPage()
		if (location !== origin) {
			session.processNextPage()
		} else {
			//Serialize session for the last time when we want to go back to origin page
			//Normally, processNextPage() invokes serialize
			session.serialize()
		}
		printLog("Changing location to: " + location)
		window.location.href = location
	}
}

export { ScrapeSession, Navigation };