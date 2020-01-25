import {printLog, printError} from './logging.mjs';
import {JiraUrlUtils, JiraIssueParser} from './jira.mjs';
import {gtnQueryParam} from './common-constants.mjs';
import * as Quanta from './quanta.mjs';

class StorageKeys {
	static get SCRAPE_SESSION_OBJ() { return 'gtnmonkey_scrapesession_obj' }
}



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
    		quantaTestLog: Quanta.testLogsTemplate.replace(Quanta.gtnPlaceholder, gtn),
    		quantaDiagBundle: Quanta.diagBundleTemplate.replace(Quanta.gtnPlaceholder, gtn),
    		quantaTestLogDownloadName: `${this.id}-${gtn}-${Quanta.quantaTestLogsFilename}`,
    		quantaDiagBundleDownloadName: `${this.id}-${gtn}-${Quanta.quantaDiagBundleFilename}`
    	});
    	return map;
	}.bind(this), new Map());
  }
}

class Storage {
	static cleanup() {
		this.deleteLocalStorageItem(StorageKeys.SCRAPE_SESSION_OBJ)
	}

	static deleteLocalStorageItem(key) {
		printLog("Deleting localStorage item " + key);
		window.localStorage.removeItem(key)
	}

	static serializeObject(key, obj) {
		window.localStorage.setItem(key, JSON.stringify(obj))
	}

	static deserializeObject(key, clazz) {
		var parsedObj = JSON.parse(window.localStorage.getItem(key))
		var instance = new (clazz)
		return Object.assign(instance, parsedObj)
	}
}

export {Storage, StorageKeys, JiraData};