import {printLog, printError} from './logging.mjs';
import {LinkUtils, ElementUtils} from './utils.mjs';
import {gtnQueryParam} from './common-constants.mjs';
import {storeFoundGTNLinksForJiraIssue} from './gtn-monkey.mjs'

//Jira-related / Jira-defined stuff: buttons, dialogs, elements
const JIRA_SERVER_URL = "https://jira.cloudera.com"
const JIRA_ISSUES_URL_FRAGMENT = "issues/?"
const JIRA_FILTERPAGE_URL_FRAGMENT = "issues/?filter="

//These are 2 states for the "Show more comments" button: 
//Examples:
//1. When collapsed
//<a class="collapsed-comments" href="/browse/CDH-76879?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&amp;showAll=true">
//<span class="collapsed-comments-line"></span><span class="show-more-comments" data-collapsed-count="18">18 older comments</span></a>

//2. While Loading
//<span class="show-more-comments" data-collapsed-count="18">Loading...</span>
const showMoreCommentsButton = "show-more-comments"
const collapsedCommentsButton = "collapsed-comments"
const descriptionSelector = '#descriptionmodule p'
const commentSelector = '.twixi-wrap > .action-body'
export const jiraSummarySelector = '#summary-val'
export const jiraIssuesOnFilterPageSelector = '.results-panel .issuekey a'

class JiraConstants {
	static get JIRA_FILTER_NAME_SELECTOR() { return '.search-title' }
}

class JiraUrlUtils {
	static getJiraName(fromUrl) {
		if (fromUrl == null) {
			return window.location.href.split("browse/")[1]	
		} else {
			return fromUrl.split("browse/")[1]	
		}
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

class JiraIssueParser {
	//TODO storeFoundGTNLinksForJiraIssue can be a callback
	static parseGTNLinksFromPage(callback) {
		printLog("Parsing GTN links from current page")
		//Click on show more comments button
		myjQuery('.' + collapsedCommentsButton).trigger("click")
		//TODO can't figure out why the call above does not work!!	
		jQuery('.' + collapsedCommentsButton).trigger("click")

		this.waitForCommentsLoaded([this.parseAndSaveComments, this.parseAndSaveLinksFromDescription, callback])
	}

	static parseAndSaveComments() {
		printLog("Comments loaded");
		var allLinks = []
		myjQuery(commentSelector).each(function() {
			var links = LinkUtils.findLinksInHtml(myjQuery(this).html(), gtnQueryParam)

			if (links == null) {
				storeFoundGTNLinksForJiraIssue([])
			} else {
				if (links.length > 0) {
					allLinks = allLinks.concat(links)
				}
			}
	 	});

		storeFoundGTNLinksForJiraIssue(allLinks)
	}

	static waitForCommentsLoaded(functionsToCall) {
		ElementUtils.waitForElement("." + showMoreCommentsButton, functionsToCall)
	}

	static parseAndSaveLinksFromDescription() {
		var description = myjQuery(descriptionSelector).html()
		var links = LinkUtils.findLinksInHtml(description, gtnQueryParam)
		if (links != null) {
			storeFoundGTNLinksForJiraIssue(links)
		} else {
			storeFoundGTNLinksForJiraIssue([])
		}
	}
}

export {JiraUrlUtils, JiraConstants, JiraIssueParser}