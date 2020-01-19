import {RequestUtils, ElementUtils} from './utils.mjs';
import {printLog, printError} from './logging.mjs';
import {GtnMonkeyDataStorage} from './storage.mjs';

//TODO can be removed later
import * as Overlay from './overlay.mjs';


const quantaUrlSplitAlong = "/s3/quanta/"
const urlFragmentTestLogs = "TEST_LOGS"
const urlFragmentDiagBundle = "DIAG_LOGS"
const QUANTA_URL_VPN_CHECK = "https://quanta.infra.cloudera.com"

class Quanta {
	static checkLinks() {
		var allJiraData = GtnMonkeyDataStorage.deserializeAllJiraData()
		RequestUtils.checkURL(CORS_ANYWHERE_SERVER_URL, () => { //successcallback

			//Perform VPN check
			this.validateQuantaURL(QUANTA_URL_VPN_CHECK, () => {
				this.checkLinksInternal(allJiraData)
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

	static checkLinksInternal(allJiraData) {
		allJiraData.forEach(jd => {
			jd.links.forEach((value, key, map) => {
				this.validateQuantaURL(map.get(key).quantaTestLog, this.handleQuantaFetchResult.bind(this))
				this.validateQuantaURL(map.get(key).quantaDiagBundle, this.handleQuantaFetchResult.bind(this))
				})
			})
	}

	static extractGtnFromURL(url) {
		if (url.indexOf(quantaUrlSplitAlong) != -1) {
			return url.split(quantaUrlSplitAlong)[1].split('/')[0]
		} else {
			console.error(`Unexpected URL, URL should contain '${quantaUrlSplitAlong}'. Got URL: ${resonse.url}`)
		}
	}

	static handleQuantaFetchResult(url, result) {
		//result: boolean
		var gtn = this.extractGtnFromURL(url)
		if (url.indexOf(urlFragmentTestLogs) != -1) {
			ElementUtils.highlightElements("p", Overlay.quantaTestLogParagraphIdPrefix, gtn, result)	
		} else if (url.indexOf(urlFragmentDiagBundle) != -1) {
			ElementUtils.highlightElements("p", Overlay.quantaBundleParagraphIdPrefix, gtn, result)
		}
	}

	//TODO move as much as possible to RequestUtils class?
	static validateQuantaURL(url, successCallback, errorCallback) {
		RequestUtils.requestHttpHead(`${CORS_ANYWHERE_SERVER_URL}/${url}`).then((response) => {
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
}

export {Quanta};


