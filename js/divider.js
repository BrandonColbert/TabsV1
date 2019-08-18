import Divider from "/js/classes/divider.js"
import DividerUtils from "/js/classes/dividerutils.js"
import Page from "/js/classes/page.js"

let divider = new Divider()

divider.reloadPages()
divider.reloadDropdownList()

function onMessage(message, sender, sendResponse) {
	switch(message.event) {
		case "dividerBatchExpand":
			if(message.divider == divider.name) {
				let items = divider.pages.children

				for(let index of message.orderedIndices.sort((a, b) => b - a))
					items[index].remove()
			}
			break
		case "dividerBatchCompress":
			if(message.divider == divider.name) {
				let items = divider.pages
				let first = items.firstChild;

				for(let page of message.pages)
					items.insertBefore(new Page(divider, page).div, first)

				divider.checkSearch()
			}
			break
		case "dividerExpand":
			if(message.divider == divider.name)
				divider.pages.children[message.pageIndex].remove()
			break
		case "dividerCompress":
			if(message.divider == divider.name) {
				divider.pages.prepend(new Page(divider, message.page).div)
				divider.checkSearch()
			}
			break
		case "dividerRename":
			if(message.oldName == divider.name)
				divider.name = message.newName

			divider.reloadDropdownList()
			break
		case "dividerRemove":
			if(message.name == divider.name)
				window.close()
			else
				divider.reloadDropdownList()
			break
		case "pageReorder":
			if(message.divider == divider.name) {
				let items = divider.pages
				items.insertBefore(items.children[message.oldIndex], items.children[message.newIndex])
			}
			break
		case "dividerAdd":
			divider.reloadDropdownList()
			break
		case "dividerReorder":
			divider.reloadDropdownList()
			break
		default:
			break
	}
}

DividerUtils.onMessageSelf(onMessage)
chrome.runtime.onMessage.addListener(onMessage)