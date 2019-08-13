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
				message.orderedIndices.forEach(index => items[index].remove())
			}
			break
		case "dividerBatchCompress":
			if(message.divider == divider.name) {
				let items = divider.pages
				message.pages.forEach(page => items.appendChild(new Page(divider, page).div))
				divider.checkSearch()
			}
			break
		case "dividerExpand":
			if(message.divider == divider.name)
				divider.pages.children[message.pageIndex].remove()
			break
		case "dividerCompress":
			if(message.divider == divider.name) {
				divider.pages.appendChild(new Page(divider, message.page).div)
				divider.checkSearch()
			}
			break
		case "dividerRename":
			if(message.oldName == divider.name)
				divider.name = message.newName

			divider.reloadDividerDropdown()
			break
		case "dividerRemove":
			if(message.name == divider.name)
				window.close()
			else
				divider.reloadDividerDropdown()
			break
		case "pageReorder":
			if(message.divider == divider.name) {
				let items = divider.pages
				items.insertBefore(items.children[message.oldIndex], items.children[message.newIndex])
			}
			break
		case "dividerAdd":
			divider.reloadDividerDropdown()
			break
		case "dividerReorder":
			divider.reloadDividerDropdown()
			break
		default:
			break
	}
}

DividerUtils.onMessageSelf(onMessage)
chrome.runtime.onMessage.addListener(onMessage)