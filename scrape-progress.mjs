import {JiraUrlUtils} from './jira.mjs';
import {printLog, printError} from './logging.mjs';

export const PROGRESS_FINISHED = "Finished"
export const PROGRESS_STARTED = "Started"

class ScrapeProgress {
	//Can be STARTED, FINISHED or a number (e.g. 2) indicating number of processed items
	state = null;
	progressStr = "";
	finishedTime = null;

	startProgress() {
		//Don't increase progress counter if just started
		this.state = PROGRESS_STARTED
	}

	storeProgress(session) {
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

export { ScrapeProgress };