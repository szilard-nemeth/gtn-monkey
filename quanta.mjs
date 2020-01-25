import {RequestUtils, ElementUtils} from './utils.mjs';
import {printLog, printError} from './logging.mjs';

//TODO can be removed later
import * as Overlay from './overlay.mjs';


const quantaUrlSplitAlong = "/s3/quanta/"
const urlFragmentTestLogs = "TEST_LOGS"
const urlFragmentDiagBundle = "DIAG_LOGS"
const QUANTA_URL_VPN_CHECK = "https://quanta.infra.cloudera.com"

//elements of result table
export const quantaTestLogParagraphIdPrefix = "quantatestlog"
export const quantaBundleParagraphIdPrefix = "quantabundle"

export const quantaTestLogsFilename = "QUASAR_TEST_LOGS.zip"
export const quantaDiagBundleFilename = "QUASAR_DIAG_LOGS.zip"
export const gtnPlaceholder = "$GTN$"

//URL example: http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/1681945/QUASAR_ZIP_FOLDER/QUASAR_TEST_LOGS.zip
const quantaTemplate = `http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/${gtnPlaceholder}/QUASAR_ZIP_FOLDER/`

export const testLogsTemplate = quantaTemplate + quantaTestLogsFilename
export const diagBundleTemplate = quantaTemplate + quantaDiagBundleFilename


class Quanta {
	static checkLinks(allJiraData) {
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
			ElementUtils.highlightElements("p", quantaTestLogParagraphIdPrefix, gtn, result)	
		} else if (url.indexOf(urlFragmentDiagBundle) != -1) {
			ElementUtils.highlightElements("p", quantaBundleParagraphIdPrefix, gtn, result)
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
	    	printError("Error while calling validateQuantaURL!, error: " + error)
	    	if (errorCallback != undefined) {
	    		errorCallback(error)	
	    	}
		});
	}
}

export {Quanta};


