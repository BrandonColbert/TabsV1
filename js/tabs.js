import Divider from "./classes/divider.js"

chrome.runtime.onInstalled.addListener(async details => {
	switch(details.reason) {
		case "install":
			await new Promise(r => chrome.storage.local.set({
				options: {},
				dividers: []
			}, () => r()))
			break
	}
})

//Context menu option to quickly compress a page
chrome.contextMenus.create({
	id: "menu_page",
	title: "Compress",
	contexts: ["page", "frame", "selection", "page_action"],
	onclick: async (_, tab) => {
		//Get all the tabs in the window
		let tabs = await new Promise(r => chrome.tabs.getAllInWindow(null, tabs => r(tabs)))

		//Find the closest divider left of the current tab
		let dividerTab = tabs.slice(0, tab.index).reverse().find(t => t.url.startsWith(`chrome-extension://${chrome.runtime.id}/divider`))

		if(!dividerTab)
			return

		//Compress to it
		let url = dividerTab.url
		let name = decodeURIComponent(url.substring(url.indexOf('#') + 1))
		await new Divider(name).compress(tab.id)
	}
})