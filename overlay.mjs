import {showResultsButtonSelector, attrDisabled} from './common-constants.mjs';
import {printLog, printError} from './logging.mjs';

//TODO Remove these as dependencies later: Results should come from GTN-monkey.mjs
import {ScrapeSession} from './scrape-session.mjs';
import * as GtnMonkey from './gtn-monkey.mjs';
//End of TODO

const overlayClass = "aui-blanket"
const clearResultsButtonSelector = "#gtnm-clear-results"
const gtnMonkeyDialogId = "gtnmonkey-dialog"
const gtnMonkeyResultsTableBody = "gtnmonkey-results-tbody"
const gtnMonkeyResultsIssueRow = "issuerow"
const rowNumberClass = "rownumber"
const pageTitle = "GTN MONKEY"

//elements of result table
export const quantaTestLogParagraphIdPrefix = "quantatestlog"
export const quantaBundleParagraphIdPrefix = "quantabundle"

export function renderResults(numberOfFoundIssues, allJiraData) {
	//TODO Results overlay should not depend on ScrapeSession.
	//If we have anything in storage, should show the results overlay
	
	var overlayDiv = myjQuery(`<div class="${overlayClass}" tabindex="0" aria-hidden="false"></div>`)
	overlayDiv.appendTo(myjQuery('body'))

	var progress = GtnMonkey.SCRAPE_SESSION.getOverallProgress()
	

	var validateQuantaLinksButtonId = "validate-quanta-links"
	var closeOverlayButtonId = "close-overlay-button"
	const markup = `
	 <div id="${gtnMonkeyDialogId}" class="jira-dialog box-shadow jira-dialog-open popup-width-custom jira-dialog-content-ready aui form-body" 
	 style="width: 900px;margin-left: -406px;margin-top: -383px;overflow: auto; max-height: 617px; overflow: auto">

		 <div class="jira-dialog-heading" style="height: auto">
		 	<div class="aui-toolbar2 qf-form-operations" role="toolbar">
		 		<div class="aui-toolbar2-inner">
		 			<div class="aui-toolbar2-secondary">
		 				<button id="${validateQuantaLinksButtonId}" class="aui-button" resolved="">Check Quanta links</button>
		 				<button id="${closeOverlayButtonId}" class="aui-button" resolved="">(X) Close</button>
		 			</div>
		 		</div>
		 	</div>
		 	<h2 title="${pageTitle}">${pageTitle}</h2>
		 	<h2 title="${progress}">${progress}</h2>
		 </div>
	    
	    <div class="jira-dialog-content">
	    	<div class="qf-container">
	    		<div class="qf-unconfigurable-form"></div>
	    	</div>
	    </div>
	 </div>
	`;

	var dialog = myjQuery(markup)
	dialog.appendTo(myjQuery('body'))

	document.querySelector('#' + validateQuantaLinksButtonId).addEventListener('click', GtnMonkey.checkIfQuantaLinksAreAccessible)
	document.querySelector('#' + closeOverlayButtonId).addEventListener('click', closeResults)

	showTable(numberOfFoundIssues, allJiraData)
	closeResults()
}

export function closeResults() {
	myjQuery('#' + gtnMonkeyDialogId).hide();
	myjQuery('.' + overlayClass).hide();
}

export function showResults() {
	printLog("Showing overlay...")
	//Only show if "Show results" button is enabled
	//TODO this should only depend on storage and not button states
	if (myjQuery(showResultsButtonSelector).attr(attrDisabled) !== attrDisabled) {
		myjQuery('#' + gtnMonkeyDialogId).show();
		myjQuery('.' + overlayClass).show();
	}
}

function showTable(numberOfFoundIssues, allJiraData) {

	const markup = `
	<div class="list-view">
		<div class="aui-group aui-group-split issue-table-info-bar">
			<div class="aui-item"><span class="results-count-text">
				<span class="results-count-start">1</span>–
				<span class="results-count-end">${numberOfFoundIssues}</span>
				</span>
			</div>
		</div>

		<div class="issue-table-container"><div><issuetable-web-component resolved="">
                <table id="issuetable">
                	<thead>
                		<tr class="rowHeader">
                			<th class="${rowNumberClass}">
                				<span title="${rowNumberClass}">#</span>
							</td>
                			<th class="colHeaderLink sortable headerrow-issuekey" rel="issuekey:ASC" data-id="issuekey" onclick="window.document.location='/issues/?jql=ORDER%20BY%20%22issuekey%22%20ASC'">
                				<span title="Sort By Key">Key</span>
                            </th>
                            <th class="colHeaderLink sortable headerrow-summary" rel="summary:ASC" data-id="summary" onclick="window.document.location='/issues/?jql=ORDER%20BY%20%22summary%22%20ASC'">
                                <span title="Sort By Summary">Summary</span>
                            </th>
                            <th>
                                <span title="links">GTN Links</span>
                            </th>
                            <th>
                                <span title="quanta-testlogs">Test logs</span>
                            </th>
                            <th>
                                <span title="quanta-diagbundles">Diag bundles</span>
                            </th>
                        </tr>
                    </thead>

                    <tbody id="${gtnMonkeyResultsTableBody}" class="ui-sortable">
                    <tr></tr>
                    </tbody>
	`
	var table = myjQuery(markup)
	table.appendTo(myjQuery('#' + gtnMonkeyDialogId))

	allJiraData.forEach(jd => {
		appendRowToResultTable(jd)
	})
}

export function appendRowToResultTable(jiraData) {
	function makeLinkOfJiraId(jiraData) {
		return `<a class="issue-link" data-issue-key="${jiraData.id}" href="/browse/${jiraData.id}">${jiraData.id}</a>`
	}

	function makeLinkOfJiraTitle(jiraData) {
		return `<a class="issue-link" data-issue-key="${jiraData.id}" href="/browse/${jiraData.id}">${jiraData.title}</a>`
	}

	function makeQuantaLinkParagraphs(jiraData) {
		if (jiraData.links.size > 0) {
			return Array.from(jiraData.links, ([gtn, value]) => `<p><a href="${value.quantaLink}">${gtn}</a></p>`).join('')
		}
		return "<p>N/A</p>"
	}

	function makeQuantaResourceParagraphs(jiraData, idPrefix, valueProp, downloadProp) {
		if (jiraData.links.size > 0) {
			return Array.from(jiraData.links, ([gtn, value]) => 
				`<p id="${idPrefix}-${jiraData.id}-${gtn}">
					<a href="${value[valueProp]}" download=${value[downloadProp]}>${gtn}</a>
						${makeCopyIcon(`#${idPrefix}-${jiraData.id}-${gtn}`)}
					</p>`).join('')
		} else {
			return "<p>N/A</p>"
		}
	}

	function makeQuantaTestLogParagraphs(jiraData) {
		return makeQuantaResourceParagraphs(jiraData, quantaTestLogParagraphIdPrefix, "quantaTestLog", "quantaTestLogDownloadName")
	}

	function makeQuantaDiagBundleParagraphs(jiraData) {
		return makeQuantaResourceParagraphs(jiraData, quantaBundleParagraphIdPrefix, "quantaDiagBundle", "quantaDiagBundleDownloadName")	
	}

	function makeCopyIcon(idOfItemToCopy) {
		//defer copy as table row is not yet created
		var funcCall = `copyText($('${idOfItemToCopy}').find('a')[0].download)`
		return `<img onclick="${funcCall}" src="${SERVER_URL}/copy-icon.png" alt="copy" style="width:15px;height:15px;cursor: pointer;">`
	}

	function createRow(jiraData) {
		const template = 
		`
		<tr class="${gtnMonkeyResultsIssueRow} issue-table-draggable">
			<td class="${rowNumberClass}" id="${rowNumberClass}-${jiraData.id}"></td>
			<td class="issuekey">${makeLinkOfJiraId(jiraData)}</td>
			<td class="summary">${makeLinkOfJiraTitle(jiraData)}</td>
			<td>${makeQuantaLinkParagraphs(jiraData)}</td>
			<td>${makeQuantaTestLogParagraphs(jiraData)}</td>
			<td>${makeQuantaDiagBundleParagraphs(jiraData)}</td>
		</tr>
		`
		return template
	}

	//Append row to table
	printLog("Appending row: " + jiraData)
	var html = createRow(jiraData);
	myjQuery('#' + gtnMonkeyResultsTableBody + ' tr').last().after(html);

	//Add row numbers
	myjQuery('#' + gtnMonkeyResultsTableBody + ' tr.' + gtnMonkeyResultsIssueRow).each((idx, elem) => {
		console.log($(elem).find('td.' + rowNumberClass).length); 
		$(elem).find('td.' + rowNumberClass).text(idx + 1);
	});
}


