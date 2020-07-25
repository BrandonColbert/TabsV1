import Divider from "./classes/divider.js"
import Dropdown from "./classes/view/dropdown.js"
import ReorderList from "./classes/view/reorder-list.js"

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

	if(!isNaN(Divider.expandLimit) && count > Divider.expandLimit) {
		alert(`${count} tabs cannot be opened since the limit is ${Divider.expandLimit}.\n\nThis number can be modified in settings to expand more tabs at once.`)
		return
	}

	if(count > Divider.expandThreshold && !confirm(`Are you sure you want to open ${count} new tabs?`))
		return

	await activeDivider.expand(...indices)
})

document.querySelector("#dropdown").addEventListener("click", async e => {
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
		case "url":
			e.target.style.color = "mediumblue"
			break
		case "regex":
			e.target.style.color = "navy"
			break
		case "regex-error":
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
	{text: "Export URLs", callback: async () => await activeDivider.exportUrls()},
	{text: "Import config", callback: async () => {
		let input = document.createElement("input")
		input.type = "file"
		input.onchange = e => {
			let [file] = e.target.files
			e.target.remove()
			
			let reader = new FileReader()
			reader.onload = async e => {
				let config = JSON.parse(e.target.result)
				await new Promise(r => chrome.storage.local.set(config, () => r()))

				chrome.tabs.query(
					{"url": `chrome-extension://${chrome.runtime.id}/*`},
					tabs => {
						for(let tab of tabs)
							chrome.tabs.reload(tab.id)
					}
				)
			}
			reader.readAsText(file)
		}
		input.click()
	}},
	{text: "Export config", callback: async () => await Divider.exportConfig()},
	{text: "Delete divider", callback: async () =>  {
		if(confirm(`Are you sure you want to delete '${activeDivider.name}'`))
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
	document.querySelector("#dropdown").textContent = activeDivider.name
	await refreshPages(await activeDivider.getPages())

	activeDivider.on("pagesChanged", refreshPages)
	activeDivider.on("rename", e => location.hash = e.newName)
	activeDivider.on("delete", () => window.close())
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
 * @return {Promise.<""|"url"|"regex"|"regex-error">} Query prefix
 */
async function filterPages(query) {
	let matched = new Set()
	let pages = await activeDivider.getPages()
	let length = pages?.length ?? 0
	let prefix = ""

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
		}
	}

	if(query.length == 0)
		matched = new Set(Array.from({length: length}, (_, k) => k))
	else
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
					return "regex-error"
				}
				break
			default:
				query = simplifyString(query)
				for(let i = length - 1; i >= 0; i--)
					if(simplifyString(pages[i].title).includes(query))
						matched.add(i)
				break
		}

	let pageList = document.querySelector("#pages")
	for(let i = pageList.children.length - 1; i >= 0; i--) {
		let e = pageList.children[i]
		e.style.display = matched.has(i) ? null : "none"

		let page = pages[i]
		bindPageElement(e, prefix == "url" ? {title: page.url, url: page.title} : page)
	}

	return prefix
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