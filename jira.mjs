//Jira-related / Jira-defined stuff: buttons, dialogs, elements
const JIRA_SERVER_URL = "https://jira.cloudera.com"
const JIRA_ISSUES_URL_FRAGMENT = "issues/?"
const JIRA_FILTERPAGE_URL_FRAGMENT = "issues/?filter="

class JiraConstants {
	static get JIRA_FILTER_NAME_SELECTOR() { return '.search-title' }
}

class JiraUrlUtils {
	static getJiraName() {
		return window.location.href.split("browse/")[1]
	}

	static isOriginPage() {
		return window.location.href.startsWith(`${JIRA_SERVER_URL}/${JIRA_FILTERPAGE_URL_FRAGMENT}`)
	}

	static getServerPrefixedUrl(url) {
		return JIRA_SERVER_URL + url
	}

	static extractJiraPageName() {
		return window.location.href.split(JIRA_ISSUES_URL_FRAGMENT)[1]
	}
}

export {JiraUrlUtils, JiraConstants}