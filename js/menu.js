import Divider from "./classes/divider.js"
import ReorderList from "./classes/view/reorder-list.js"

/**
 * @param {Divider} divider
 * @param {import("./classes/divider").Page} page 
 */
function createPageElement(divider, page) {
	function getIndex(e) {
		return Array.from(e.parentNode.children).indexOf(e) - 1
	}
	
	//Create the button for the page and define actions for clicking it
	let element = document.createElement("button")
	bindPageElement(element, page)

	//Navigate
	element.addEventListener("click", async e => await divider.open(getIndex(e.target), true, false))

	//Destructively navigate
	element.addEventListener("contextmenu", async e => {
		e.preventDefault()
		await divider.open(getIndex(e.target))
	})

	return element
}

/**
 * 
 * @param {HTMLElement} element 
 * @param {import("./classes/divider").Page} page 
 */
function bindPageElement(element, page) {
	let {title, url} = page
	element.textContent = title
	element.title = url
}

/**
 * @param {Divider} divider 
 */
async function createDivider(divider) {
	//Create the dividers details and assign it the same id as its page path
	let details = document.createElement("details")

	//Make the name the same as the divider name
	let summary = document.createElement("summary")

	//Right click text to edit divider name
	let name = document.createElement("text")
	name.textContent = divider.name

	name.addEventListener("contextmenu", e => {
		//Disable context menu
		e.preventDefault()

		//Make editable and focus
		name.contentEditable = true
		name.focus()

		//Select all text
		let range = document.createRange()
		range.selectNodeContents(name)
		window.getSelection().removeAllRanges()
		window.getSelection().addRange(range)
	})

	name.addEventListener("keydown", async e => {
		if(name.contentEditable == "true") {
			if(e.code == "Escape") { //Escape to leave text as original
				//Prevent exiting extension
				e.preventDefault()
				
				name.contentEditable = false
				name.textContent = divider.name
			} else if(e.code == "Enter") { //Enter to rename
				name.contentEditable = false

				//Try renaming and revert name if callback result is false
				if(!(await divider.rename(name.textContent)))
					name.textContent = divider.name
			} else if(e.code == "Space") {
				e.preventDefault()
				name.innerHTML += "&nbsp;"
				window.getSelection().collapse(name.childNodes[0], name.textContent.length);
			}
		}
	})

	name.addEventListener("focusout", () => {
		//Unselecting while editing leaves text as original
		if(name.contentEditable == "true") {
			name.contentEditable = false
			name.textContent = divider.name
		}
	})

	name.addEventListener("click", () => {
		//Prevent toggling open status while renaming
		if(name.contentEditable == "true")
			details.open = !details.open
	})

	//Show button to navigate to the divider's page
	let interact = document.createElement("button")
	interact.classList.add("interact")

	//Open divider with the divider's name as metadata
	interact.addEventListener("contextmenu", e => {
		e.preventDefault()
		Divider.open(divider.name)
	})

	//Compress the open tab to the divider
	interact.addEventListener("click", async () => {
		let [tab] = await new Promise(r => chrome.tabs.query({active: true, currentWindow: true}, tabs => r(tabs)))

		if(tab)
			await divider.compress(tab.id)
	})

	//Display them properly in html
	summary.append(interact)
	summary.append(name)
	details.append(summary)

	const reorderList = new ReorderList(details)
	reorderList.dragClass = "dragged"
	reorderList.callback = async (from, to) => {
		from -= 1
		to -= 1

		let pages = await divider.getPages()
		let page = pages[from]

		pages.splice(from, 1)
		pages.splice(to, 0, page)

		await divider.setPages(pages)
	}

	async function refreshPages() {
		let pages = await divider.getPages()
		let length = pages?.length ?? 0

		while(details.children.length - 1 > length)
			details.lastChild.remove()

		for(let i = Math.min(length, details.children.length - 1) - 1; i >= 0; i--)
			bindPageElement(details.children[i + 1], pages[i])

		while(details.children.length - 1 < length) {
			let e = createPageElement(divider, pages[details.children.length - 1])
			details.append(e)
			reorderList.integrate(e)
		}
	}

	await refreshPages()
	divider.on("pagesChanged", refreshPages)
	divider.on("rename", e => name.textContent = e.newName)
	divider.on("delete", () => details.remove())

	return details
}

//Create dividers
void (async () => {
	const dividers = document.querySelector("#dividers")
	const reorderList = new ReorderList(dividers)

	for(let name of await Divider.all) {
		let e = await createDivider(Divider.for(name))
		dividers.append(e)
		reorderList.integrate(e, "summary > text")
	}

	reorderList.dragClass = "dragged"
	reorderList.callback = async (from, to) => {
		let names = await Divider.all
		let name = names[from]

		names.splice(from, 1)
		names.splice(to, 0, name)

		await new Promise(resolve => chrome.storage.local.set(
			{dividers: names},
			() => resolve()
		))
	}
})()

document.querySelector("#create").onclick = async () => await createDivider(await Divider.create())