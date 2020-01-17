import {Storage, StorageKeys} from './storage.mjs';
import {JiraUrlUtils, JiraConstants} from './jira.mjs';
import {printLog, printError} from './logging.mjs';

//TODO make Progress class to decouple progress
//progress
export const PROGRESS_FINISHED = "Finished"
export const PROGRESS_STARTED = "Started"

class ScrapeSession {

	static start() {
		this.storeProgress(PROGRESS_STARTED)
	}

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

	static storeOriginPage() {
		var origin = window.location.href
		var filterName = myjQuery(JiraConstants.JIRA_FILTER_NAME_SELECTOR).text()
		window.localStorage.setItem(StorageKeys.ORIGIN_PAGE, origin)
		window.localStorage.setItem(StorageKeys.JIRA_FILTER_NAME, filterName)
		printLog("Stored origin page: " + origin)
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

export { ScrapeSession };