import Divider from "./classes/divider.js"
import Dropdown from "./classes/view/dropdown.js"
import ReorderList from "./classes/view/reorder-list.js"
import Tabs from "./classes/tabs.js"

/** @type {Divider} */
let activeDivider = null

//Enables page to be re-ordered through via dragging
const reorderList = new ReorderList(document.querySelector("#pages"))
reorderList.dragClass = "dragged"
reorderList.callback = async (from, to) => {
	let pages = await activeDivider.getPages()
	let page = pages[from]

	pages.splice(from, 1)
	pages.splice(to, 0, page)

	activeDivider.setPages(pages)
}

document.querySelector("#compress-left").addEventListener("click", async () => await activeDivider.compress((activeTab, tab) => tab.index < activeTab.index))
document.querySelector("#compress-right").addEventListener("click", async () => await activeDivider.compress((activeTab, tab) => tab.index > activeTab.index))
document.querySelector("#expand-right").addEventListener("click", async () => {
	let pages = document.querySelector("#pages")
	let length = pages.children.length
	let indices = []

	for(let i = 0; i < length; i++) {
		let page = pages.children[i]

		if(!page.style.display || page.style.display == "block")
			indices.push(i)
	}
	
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

	let element = Dropdown.create(
		names.map(v => ({
			text: v,
			callback: () => location.hash = v
		})),
		{
			height: "50%",
			target: e.target
		}
	)

	element.children[names.indexOf(activeDivider.name)]?.scrollIntoView({block: "center"})
})

document.querySelector("#searchbar").addEventListener("input", async e => {
	switch(await filterPages(e.target.value)) {
		case "special":
			e.target.style.color = "navy"
			break
		case "fail":
			e.target.style.color = "orangered"
			break
		default:
			e.target.style.color = null
			break
	}
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

window.addEventListener("hashchange", activateDivider)

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
	await refreshPages(await activeDivider.getPages())

	activeDivider.on("pagesChanged", refreshPages)
	activeDivider.on("rename", e => location.hash = e.newName)
	activeDivider.on("delete", async index => {
		let names = await Divider.all

		if(names.length == 0)
			window.close()
		else
			location.hash = names[Math.min(index, names.length - 1)]
	})
}

/**
 * Refreshes displayed pages
 * @param {Page[]} pages 
 */
async function refreshPages(pages) {
	let element = document.querySelector("#pages")
	let length = pages?.length ?? 0

	while(element.children.length > length)
		element.lastChild.remove()

	for(let i = Math.min(length, element.children.length) - 1; i >= 0; i--)
		bindPageElement(element.children[i], pages[i])

	while(element.children.length < length) {
		let e = createPageElement(pages[element.children.length])
		element.append(e)
		reorderList.integrate(e, "button")
	}

	await filterPages(document.querySelector("#searchbar").value)
}

/**
 * @param {import("./classes/divider").Page} page 
 */
function createPageElement(page) {
	let element = document.createElement("div")
	element.classList.add("page")

	let getInteractIndex = e => Array.from(document.querySelector("#pages").children).indexOf(e.parentNode)

	let interact = document.createElement("button")
	interact.classList.add("pageButton")

	interact.addEventListener("click", async e => {
		e.preventDefault()
		await activeDivider.open(getInteractIndex(e.target), false, false)
	})

	interact.addEventListener("contextmenu", async e => {
		e.preventDefault()
		await activeDivider.expand(getInteractIndex(e.target))
	})

	element.append(interact)
	element.append(document.createElement("div"))

	bindPageElement(element, page)

	return element
}

/**
 * @param {HTMLElement} element
 * @param {import("./classes/divider").Page} page 
 */
function bindPageElement(element, page) {
	let {title, url} = page

	let interact = element.querySelector(":nth-child(1)")
	interact.title = url

	let text = element.querySelector(":nth-child(2)")
	text.textContent = title
	text.title = title
}

/**
 * Filters visible pages based on a search query
 * @param {string} query Query to filter items based on
 * @return {Promise.<"pass"|"fail"|"special">} Query result
 */
async function filterPages(query) {
	let matched = new Set()
	let pages = await activeDivider.getPages()
	let length = pages?.length ?? 0
	let [prefix, result] = ["", ""]

	if(query.startsWith(":")) {
		let [p] = query.split(" ", 1)
		prefix = p.substring(1)
		query = query.substring(p.length + 1)

		switch(prefix) {
			case "address":
			case "link":
			case "site":
				prefix = "url"
				break
			case "regexp":
			case "regularexpression":
				prefix = "regex"
				break
			case "anti":
			case "exclude":
			case "opposite":
			case "without":
				prefix = "not"
				break
		}
	}

	if(query.length == 0) {
		result = "pass"
		matched = new Set(Array.from({length: length}, (_, k) => k))
	} else {
		result = "special"

		switch(prefix) {
			case "url":
				query = simplifyString(query)
				for(let i = length - 1; i >= 0; i--)
					if(simplifyString(pages[i].url).includes(query))
						matched.add(i)
				break
			case "regex":
				try {
					let regex = new RegExp(query)

					for(let i = length - 1; i >= 0; i--)
						if(regex.test(simplifyString(pages[i].title)))
							matched.add(i)
				} catch(e) {
					return "fail"
				}
				break
			case "not":
				query = simplifyString(query)
				for(let i = length - 1; i >= 0; i--)
					if(!simplifyString(pages[i].url).includes(query))
						matched.add(i)
				break
			default:
				query = simplifyString(query)
				for(let i = length - 1; i >= 0; i--)
					if(simplifyString(pages[i].title).includes(query))
						matched.add(i)

				result = "pass"
				break
		}
	}

	let pageList = document.querySelector("#pages")
	for(let i = pageList.children.length - 1; i >= 0; i--) {
		let e = pageList.children[i]
		e.style.display = matched.has(i) ? null : "none"

		let page = pages[i]
		bindPageElement(e, prefix == "url" ? {title: page.url, url: page.title} : page)
	}

	return result
}

/**
 * @param {string} value String to simplify
 * @returns {string} Simplified version of original string
 */
function simplifyString(value) {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
}

activateDivider()