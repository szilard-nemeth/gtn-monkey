import {GtnMonkeyDataStorage, Storage, StorageKeys} from './storage.mjs';
import {JiraUrlUtils} from './jira.mjs';
import {printLog, printError} from './logging.mjs';


//TODO make Progress class to decouple progress
//progress
export const PROGRESS_FINISHED = "Finished"
export const PROGRESS_STARTED = "Started"

//TODO make this an object and only store state through instance of this class
class ScrapeSession {
	constructor() {    
    	this.progress = new ScrapeProgress();
  	}

	static start(jiraFilterName) {
		this.progress = new ScrapeProgress();
		this.progress.storeProgress(PROGRESS_STARTED)
		GtnMonkeyDataStorage.storeFilterName(jiraFilterName)
		GtnMonkeyDataStorage.storeOriginPage(window.location.href)

		var issues = GtnMonkeyDataStorage.storeFoundJiraIssues()
		if (!issues || issues.length == 0) {
			printLog("NO JIRA ISSUES FOUND IN CURRENT PAGE!")
			return false
		}
		return true
	}

	static processNextPage() {
		this.progress.storeProgress()
		Storage.storeObject(StorageKeys.PROGRESS_OBJ, this.progress)
	}
	
	static isInProgress() {
		return this.progress.isInProgress()
	}

	static stop() {
		this.progress.stopProgress()
		Storage.storeObject(StorageKeys.PROGRESS_OBJ, this.progress)
	}

	static getOverallProgress() {
		return this.progress.getOverallProgress()
	}

	static isFinished() {
		return this.progress.isFinished()
	}

	//TODO rename: isFinishedRecently
	static isFinishedJustNow() {
		return this.progress.isFinishedJustNow()
	}

	static isFinishedProcessing() {
		return window.location.href == GtnMonkeyDataStorage.getOriginPage() && this.isInProgress()
	}

	//TODO should serialize progress
	static gotoNextPageAtStart() {
		Navigation.navigate(GtnMonkeyDataStorage.getFoundJiraIssues()[0])
	}

	//TODO should serialize progress
	static gotoNextPageWhileScraping(page) {
		//TODO no need to re-store data, don't delete source issue links array, just store current index!
		var issues = GtnMonkeyDataStorage.getFoundJiraIssues()
		var parsedPage = issues.shift()
		printLog("Parsed GTN links from current page")
		//store modified jira issues array to Storage so next execution of onDocumentReady() picks up next page
		GtnMonkeyDataStorage.storeFoundJiraIssues(issues)

		//Navigate to next page
		if (issues.length > 0) {
			Navigation.navigate(issues[0])
		} else {
			var originPage = GtnMonkeyDataStorage.getOriginPage()
			printLog("No more pages to process. Changing location to origin jira URL: " + originPage)
			Navigation.navigate(originPage)
		}
	}

	static getDataForJiraIssue(jiraIssue) {
		return GtnMonkeyDataStorage.getStoredJiraDataForIssue(jiraIssue)
	}

	static getDataForJiraIssues() {
		var issues = GtnMonkeyDataStorage.getFoundJiraIssues()
		printLog("Retrieved jira issues from storage: " + issues)
		return issues
	}
}

class ScrapeProgress {
	//Can be STARTED, FINISHED or a number (e.g. 2) indicating number of processed items
	state = null;
	progressStr = "";
	finishedTime = null;

	storeProgress(state) {
		if (state != undefined && state != null) {
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

		var jiraIssue = JiraUrlUtils.getJiraName()
		var numberOfFoundIssues = GtnMonkeyDataStorage.getNumberOfFoundJiraIssues()
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

	getOverallProgress() {
		if (this.progressStr && this.progressStr != null) {
			if (this.progressStr === PROGRESS_FINISHED) {
				return `Finished processing Jira filter '${GtnMonkeyDataStorage.getFilterName()}' with ${GtnMonkeyDataStorage.getNumberOfFoundJiraIssues()} items`
			} else {
				return `Processing Jira filter '${GtnMonkeyDataStorage.getFilterName()}': ${this.progressStr}`		
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

	//TODO rename: isFinishedRecently
	isFinishedJustNow() {
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
	static navigate(location) {
		var origin = GtnMonkeyDataStorage.getOriginPage()
		if (location !== origin) {
			ScrapeSession.processNextPage()
		}
		printLog("Changing location to: " + location)
		window.location.href = location
	}
}

export { ScrapeSession, Navigation, ScrapeProgress };