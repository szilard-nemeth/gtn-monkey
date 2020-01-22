import {Storage, StorageKeys} from './storage.mjs';
import {JiraUrlUtils, JiraConstants} from './jira.mjs';
import {printLog, printError} from './logging.mjs';
import {Navigation} from './scrape-session.mjs';


//TODO make Progress class to decouple progress
//progress
export const PROGRESS_FINISHED = "Finished"
export const PROGRESS_STARTED = "Started"

//TODO make this an object and only store state through instance of this class
class ScrapeSession {

	static start() {
		ScrapeProgress.storeProgress(PROGRESS_STARTED)
		ScrapeSession.storeOriginPage()

		var issues = GtnMonkeyDataStorage.storeFoundJiraIssues()
		if (!issues || issues.length == 0) {
			printLog("NO JIRA ISSUES FOUND IN CURRENT PAGE!")
			return false
		}
		return true
	}

	static processNextPage() {
		ScrapeProgress.storeProgress()	
	}
	
	static isInProgress() {
		ScrapeProgress.isInProgress()
	}

	static stop() {
		ScrapeProgress.stopProgress()
	}

	static getOverallProgress() {
		ScrapeProgress.getOverallProgress()
	}

	//private
	static storeOriginPage() {
		Storage.storeFilterName(myjQuery(JiraConstants.JIRA_FILTER_NAME_SELECTOR).text())
		Storage.storeOriginPage(window.location.href)
	}

	static isFinished() {
		ScrapeProgress.isFinished()
	}

	//TODO rename: isFinishedRecently
	static isFinishedJustNow() {
		ScrapeProgress.isFinishedJustNow()
	}

	static gotoNextPageAtStart() {
		Navigation.navigate(Storage.getFoundJiraIssues()[0])
	}

	static gotoNextPageWhileScraping(page) {
		//TODO no need to re-store data, don't delete source issue links array, just store current index!
		var issues = Storage.getFoundJiraIssues()
		var parsedPage = issues.shift()
		printLog("Parsed GTN links from current page")
		//store modified jira issues array to Storage so next execution of onDocumentReady() picks up next page
		GtnMonkeyDataStorage.storeFoundJiraIssues(issues)

		//Navigate to next page
		if (issues.length > 0) {
			Navigation.navigate(issues[0])
		} else {
			var originPage = Storage.getOriginPage()
			printLog("No more pages to process. Changing location to origin jira URL: " + originPage)
			Navigation.navigate(originPage)
		}
	}

	static getDataForJiraIssue() {
		return GtnMonkeyDataStorage.getStoredJiraDataForIssue(jiraIssue)
	}

	static getDataForJiraIssues() {
		var issues = Storage.getFoundJiraIssues()
		printLog("Retrieved jira issues from storage: " + issues)
		return issues
	}
}

class ScrapeProgress {
	static storeProgress(state) {
		if (state != undefined && state != null) {
			window.localStorage.setItem(StorageKeys.PROGRESS, state)
		}

		if (state == PROGRESS_STARTED) {
			//Don't increase progress counter if just started
			return
		}

		var numberOfFoundIssues = Storage.getNumberOfFoundJiraIssues()
		var prevProgress = window.localStorage.getItem(StorageKeys.PROGRESS)

		var progress
		if (prevProgress == null || prevProgress === PROGRESS_STARTED) {
			progress = 1
		} else {
			progress = parseInt(prevProgress, 10) + 1
		}

		var jiraIssue = JiraUrlUtils.getJiraName()
		window.localStorage.setItem(StorageKeys.PROGRESS, progress)
		window.localStorage.setItem(StorageKeys.PROGRESS_STR, `${progress} / ${numberOfFoundIssues} (Jira: ${jiraIssue})`)
		printLog("Stored progress: " + progress)
	}

	static isInProgress() {
		var progress = window.localStorage.getItem(StorageKeys.PROGRESS)
		if (progress == null || progress === PROGRESS_FINISHED) {
			return false
		}
		return true
	}

	static stopProgress() {
		window.localStorage.setItem(StorageKeys.PROGRESS, PROGRESS_FINISHED)
		window.localStorage.setItem(StorageKeys.PROGRESS_STR, PROGRESS_FINISHED)
		window.localStorage.setItem(StorageKeys.PROGRESS_FINISHED_AT, Date.now())
		printLog("Stopped progress")
	}

	static getOverallProgress() {
		var overallProgress = window.localStorage.getItem(StorageKeys.PROGRESS_STR)
		if (overallProgress && overallProgress != null) {
			if (overallProgress === PROGRESS_FINISHED) {
				return `Finished processing Jira filter '${Storage.getFilterName()}' with ${Storage.getNumberOfFoundJiraIssues()} items`
			} else {
				return `Processing Jira filter '${Storage.getFilterName()}': ${overallProgress}`		
			}
		}
		return "Unknown progress"
	}

	static isFinished() {
		var progress = window.localStorage.getItem(StorageKeys.PROGRESS)
		if (progress === PROGRESS_FINISHED) {
			return true
		}
		return false
	}

	//TODO rename: isFinishedRecently
	static isFinishedJustNow() {
		if (!this.isFinished()) {
			return false
		}
		var finishedTime = window.localStorage.getItem(StorageKeys.PROGRESS_FINISHED_AT)
		var now = Date.now()
		if (now - finishedTime <= 10000) {
			return true
		}
		return false
	}
}

class Navigation {
	static navigate(location) {
		var origin = Storage.getOriginPage()
		if (location !== origin) {
			ScrapeSession.processNextPage()
		}
		printLog("Changing location to: " + location)
		window.location.href = location
	}
}

export { ScrapeSession, Navigation };