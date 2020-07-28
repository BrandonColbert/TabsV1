import Divider from "./classes/divider.js"
import Dropdown from "./classes/view/dropdown.js"
import Tabs from "./classes/tabs.js"
import PagesElement from "./classes/elements/pages-element.js"
import ExactFilter from "./classes/filters/exact-filter.js"
import NotFilter from "./classes/filters/not-filter.js"
import RegexFilter from "./classes/filters/regex-filter.js"
import UrlFilter from "./classes/filters/url-filter.js"
import SetFilter from "./classes/filters/set-filter.js"

/** @type {Divider} */
let activeDivider = null

let pagesElement = new PagesElement(document.querySelector("#pages"))
pagesElement.addFilter(
	new ExactFilter(),
	new NotFilter(),
	new RegexFilter(),
	new SetFilter(),
	new UrlFilter()
)

/**
 * Activates the divider correlating with this tab's hash
 */
async function activateDivider() {
	activeDivider?.removeCallbacks()

	let name = decodeURIComponent(location.hash).substring(1)
	let names = await Divider.all
	if(names.length > 0 && !names.includes(name)) {
		location.hash = names[0]
		return
	}

	activeDivider = Divider.for(name)
	document.title = `(${activeDivider.name}) | Divider`
	document.querySelector("#title").textContent = activeDivider.name
	await pagesElement.setDivider(activeDivider)

	activeDivider.on("pagesChanged", pagesElement.refresh)
	activeDivider.on("rename", e => location.hash = e.newName)
	activeDivider.on("delete", async index => {
		let names = await Divider.all

		if(names.length == 0)
			window.close()
		else
			location.hash = names[Math.min(index, names.length - 1)]
	})
}

activateDivider()

window.addEventListener("hashchange", activateDivider)

document.querySelector("#compress-left").addEventListener("click", async () => await activeDivider.compress((activeTab, tab) => tab.index < activeTab.index))
document.querySelector("#compress-right").addEventListener("click", async () => await activeDivider.compress((activeTab, tab) => tab.index > activeTab.index))
document.querySelector("#expand-right").addEventListener("click", async () => {
	let indices = pagesElement.visibleIndices
	let count = indices.length
	let limit = await Tabs.getOption("expandLimit")
	let threshold = await Tabs.getOption("expandThreshold")

	//Maximum number of pages that should be expanded at once
	if(limit > 0 && count > limit) {
		alert(`${count} tabs cannot be opened since the limit is ${limit}.\n\nThis number can be modified in settings to expand more tabs at once.`)
		return
	}

	//Threshold for number of pages that may be expanded before requesting confirmation from the user
	if(threshold > 0 && count > threshold && !confirm(`Are you sure you want to open ${count} new tabs?`))
		return

	await activeDivider.expand(...indices)
})

document.querySelector("#title").addEventListener("click", async e => {
	let names = await Divider.all

	Dropdown.create(
		names.map(v => ({
			text: v,
			callback: () => location.hash = v
		})),
		{
			height: "50%",
			target: e.target
		}
	).children[names.indexOf(activeDivider.name)]?.scrollIntoView({block: "center"})
})

document.querySelector("#searchbar").addEventListener("input", async e => {
	switch(await pagesElement.filter(e.target.value)) {
		case "special":
			e.target.style.color = "var(--color-primary)"
			break
		case "fail":
			e.target.style.color = "var(--color-primary-variant)"
			break
		default:
			e.target.style.color = null
			break
	}

	e.target.title = pagesElement.currentFilter.description
})

document.querySelector("#searchbar").addEventListener("keydown", e => {
	switch(e.key) {
		case "Enter":
			e.preventDefault()
			break
	}
})

document.querySelector("#config").addEventListener("click", e => Dropdown.create([
	{text: "Export pages", callback: async () => {
		//Exports a txt containing the title and url of all the pages in the divider
		let pages = await activeDivider.getPages()

		let rule = await Tabs.getOption("exportPageRule")

		let data = pages
			.map(page => {
				let date = new Date(page.time)

				return rule
					.replace(/{title}/g, page.title)
					.replace(/{url}/g, page.url)
					.replace(/{date}/g, date.toLocaleDateString())
					.replace(/{time}/g, new Intl.DateTimeFormat(
						"default",
						{
							hour12: true,
							hour: "numeric",
							minute: "numeric"
						}
					).format(date))
			})
			.join("\r\n")

		let link = document.createElement("a")
		link.href = URL.createObjectURL(new Blob([data], {type: "text"}))
		link.download = `${activeDivider.name}.txt`
		link.click()
	}},
	{text: "Duplicate divider", callback: async () => {
		let names = await Divider.all
		let index = 1

		do
			name = `${activeDivider.name} (${index++})`
		while(names.indexOf(name) != -1)

		let copy = await Divider.create(name)
		await copy.setPages(await activeDivider.getPages())

		location.hash = copy.name
	}},
	{text: "Import config", callback: async e => {
		if(!(await Tabs.importConfig())) {
			e.target.parentNode.remove()
			return
		}

		let dividerTabs = await new Promise(r => chrome.tabs.query(
			{"url": `chrome-extension://${chrome.runtime.id}/*`},
			tabs => r(tabs)
		))

		for(let tab of dividerTabs)
			chrome.tabs.reload(tab.id)
	}},
	{text: "Export config", callback: Tabs.exportConfig},
	{text: "Delete divider", callback: async () => {
		if(await Tabs.getOption("deleteConfirmation") && !confirm(`Are you sure you want to delete '${activeDivider.name}'`))
			return

		await activeDivider.delete()
	}},
], {target: e.target}))