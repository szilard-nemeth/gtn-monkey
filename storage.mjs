import {printLog, printError} from './logging.mjs';

class StorageKeys {
	static get PROGRESS() { return 'gtnmonkey_progress' }
	static get PROGRESS_STR() { return 'gtnmonkey_progress_str' }
	static get PROGRESS_FINISHED_AT() { return 'gtnmonkey_progress_finished_at' }
	static get RESULT() { return 'gtnmonkey_result' }
	static get ORIGIN_PAGE() { return 'gtnmonkey_originPage' }
	static get JIRAISSUES() { return 'gtnmonkey_jiraissues' }
	static get NUMBER_OF_JIRA_ISSUES() { return 'gtnmonkey_number_of_jiraissues' }
	static get JIRA_FILTER_NAME() { return 'gtnmonkey_filterName' }
}

//TODO create classes: GtnMonkeyDataStorage, GtnMonkeyProgressStorage, keep Storage for generic functions like cleanup
class Storage {
	static cleanup() {
		this.deleteLocalStorageItem(StorageKeys.RESULT)
		this.deleteLocalStorageItem(StorageKeys.ORIGIN_PAGE)
		this.deleteLocalStorageItem(StorageKeys.JIRAISSUES)
		this.deleteLocalStorageItem(StorageKeys.NUMBER_OF_JIRA_ISSUES)
		this.deleteLocalStorageItem(StorageKeys.PROGRESS)
		this.deleteLocalStorageItem(StorageKeys.PROGRESS_STR)
	}

	static deleteLocalStorageItem(key) {
		printLog("Deleting localStorage item " + key);
		window.localStorage.removeItem(key)
	}

	static getNumberOfFoundJiraIssues() {
		return window.localStorage.getItem(StorageKeys.NUMBER_OF_JIRA_ISSUES)
	}

	static storeNumberOfJiraIssuesFound(issueLinksLength) {
		window.localStorage.setItem(StorageKeys.NUMBER_OF_JIRA_ISSUES, issueLinksLength)	
	}

	static storeJiraIssuesFound(issueLinks) {
		window.localStorage.setItem(StorageKeys.JIRAISSUES, JSON.stringify(issueLinks))
	}

	static storeJiraDataObjs(allJiraData) {
		var allJiraDataJson = JSON.stringify(allJiraData)
		printLog("Storing modified array of JiraData: " + allJiraDataJson)
		window.localStorage.setItem(StorageKeys.RESULT, allJiraDataJson);
	}

	static getFoundJiraIssues() {
		return JSON.parse(localStorage.getItem(StorageKeys.JIRAISSUES) || "[]");
	}

	static getJiraDataObjs() {
		var rawStr = window.localStorage.getItem(StorageKeys.RESULT)
		var allJiraDataObj = JSON.parse(rawStr)
		if (allJiraDataObj == undefined || allJiraDataObj == null) {
			allJiraDataObj = []
		}

		return allJiraDataObj
	}
	
	static storeFilterName(filterName) {
		window.localStorage.setItem(StorageKeys.JIRA_FILTER_NAME, filterName)	
	}

	//TODO used just in this class, how to mark it private
	static getFilterName() {
		return window.localStorage.getItem(StorageKeys.JIRA_FILTER_NAME)	
	}

	static storeOriginPage(originPage) {
		window.localStorage.setItem(StorageKeys.ORIGIN_PAGE, originPage)
		printLog("Stored originPage: " + originPage)
	}

	static getOriginPage() {
		return window.localStorage.getItem(StorageKeys.ORIGIN_PAGE)	
	}

	//currently unused
	static hasAnyData() {
		var progress = window.localStorage.getItem(StorageKeys.PROGRESS)
		if (progress == undefined || progress == null) {
			return false
		}
		return true
	}
}

export {Storage, StorageKeys};