import {printLog, printError} from './logging.mjs';
import {JiraUrlUtils, JiraIssueParser} from './jira.mjs';
import * as MapUtils from './maputils.mjs';
import {gtnQueryParam} from './common-constants.mjs';

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

//TODO move Quanta constants to quanta.mjs
const quantaTestLogsFilename = "QUASAR_TEST_LOGS.zip"
const quantaDiagBundleFilename = "QUASAR_DIAG_LOGS.zip"
const gtnPlaceholder = "$GTN$"

//URL example: http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/1681945/QUASAR_ZIP_FOLDER/QUASAR_TEST_LOGS.zip
const quantaTemplate = `http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/${gtnPlaceholder}/QUASAR_ZIP_FOLDER/`
const testLogsTemplate = quantaTemplate + quantaTestLogsFilename
const diagBundleTemplate = quantaTemplate + quantaDiagBundleFilename



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
	//console.log("LINKZ: ")
  }
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

	//unused
	static hasAnyData() {
		var progress = window.localStorage.getItem(StorageKeys.PROGRESS)
		if (progress == undefined || progress == null) {
			return false
		}
		return true
	}
}

//TODO move these to somewhere else? Feels like these belong to jira.mjs?
const jiraSummarySelector = '#summary-val'
const jiraIssuesOnFilterPageSelector = '.results-panel .issuekey a'

//TODO Collection of in-memory JiraData objects
// var JIRADATA_LIST = []
class GtnMonkeyDataStorage {
	static storeFoundGTNLinks(jiraIssue, jiraData, newLinks) {
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
		var allJiraData = this.deserializeAllJiraData()
		var foundJiraData = this.getJiraData(allJiraData, jiraIssue, false)
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
		this.storeJiraDataObjs(allJiraData)
	}

	static storeFoundJiraIssues(jiraIssues) {
		var issueLinks
		if (jiraIssues === undefined) {
			//initial run
			issueLinks = myjQuery(jiraIssuesOnFilterPageSelector).map(function() {
				return JiraUrlUtils.getServerPrefixedUrl(myjQuery(this).attr('href'))
			}).toArray();
			printLog("Found jira issues on origin (filter) page: " + issueLinks.toString())

			//Only store number of jira issues if this is the initial run
			this.storeNumberOfJiraIssuesFound(issueLinks.length)
		} else {
			printLog("Storing jira issues: " + jiraIssues.toString())
			issueLinks = jiraIssues
		}
		this.storeJiraIssuesFound(issueLinks)

		return issueLinks
	}

	static getStoredJiraDataForIssue(jiraIssue) {
		var allJiraData = this.deserializeAllJiraData()
		return this.getJiraData(allJiraData, jiraIssue)
	}

	//TODO can be removed later (probably)
	static getJiraData(allJiraData, jiraIssueId, create = true) {
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

	static deserializeAllJiraData() {
		var allJiraDataObj = this.getJiraDataObjs();
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

	//MOVED FROM STORAGE
	//=====================
	static getNumberOfFoundJiraIssues() {
		return window.localStorage.getItem(StorageKeys.NUMBER_OF_JIRA_ISSUES)
	}

	//private
	static storeNumberOfJiraIssuesFound(issueLinksLength) {
		window.localStorage.setItem(StorageKeys.NUMBER_OF_JIRA_ISSUES, issueLinksLength)	
	}

	//private
	static storeJiraIssuesFound(issueLinks) {
		window.localStorage.setItem(StorageKeys.JIRAISSUES, JSON.stringify(issueLinks))
	}

	//private
	static storeJiraDataObjs(allJiraData) {
		var allJiraDataJson = JSON.stringify(allJiraData)
		printLog("Storing modified array of JiraData: " + allJiraDataJson)
		window.localStorage.setItem(StorageKeys.RESULT, allJiraDataJson);
	}

	//Used from ScrapeSession
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

	//used from ScrapeSession
	static storeFilterName(filterName) {
		window.localStorage.setItem(StorageKeys.JIRA_FILTER_NAME, filterName)	
	}

	//used from ScrapeSession
	static getFilterName() {
		return window.localStorage.getItem(StorageKeys.JIRA_FILTER_NAME)	
	}

	//used from ScrapeSession
	static storeOriginPage(originPage) {
		window.localStorage.setItem(StorageKeys.ORIGIN_PAGE, originPage)
		printLog("Stored originPage: " + originPage)
	}

	//used from ScrapeSession
	static getOriginPage() {
		return window.localStorage.getItem(StorageKeys.ORIGIN_PAGE)	
	}
}

export {Storage, StorageKeys, GtnMonkeyDataStorage};