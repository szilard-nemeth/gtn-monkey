import {printLog, printError} from './logging.mjs';

export function navigate(location, session) {
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
