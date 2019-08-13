import DividerUtils from "/js/classes/dividerutils.js"
import Page from "/js/classes/page.js"
import Searchbar from "/js/classes/searchbar.js"

/**
 * Represents a divider
 */
export default class Divider {
	constructor() {
		//Register elements
		this.dropdown = document.getElementById("dropdown")
		this.pages = document.getElementById("pages")
		this.searchbar = new Searchbar(document.getElementById("searchbar"))
		this.buttonDelete = document.getElementById("deleteDivider")
		this.buttonExportSave = document.getElementById("exportSave")
		this.buttonExportURLs = document.getElementById("exportURLs")
		this.buttonExpandRight = document.getElementById("expandRight")
		this.buttonCompressRight = document.getElementById("compressRight")
		this.buttonCompressLeft = document.getElementById("compressLeft")

		//Setup interactable elements
		this.buttonDelete.onclick = () => DividerUtils.remove(this.name)
		this.buttonExportSave.onclick = () => DividerUtils.exportAll()
		this.buttonCompressLeft.onclick = () => DividerUtils.compressAll(this.name, (dividerTab, tab) => tab.index < dividerTab.index)
		this.buttonCompressRight.onclick = () => DividerUtils.compressAll(this.name, (dividerTab, tab) => tab.index > dividerTab.index)
		this.buttonExportURLs.onclick = () => DividerUtils.exportURLs(this.name)
		this.searchbar.element.oninput = () => this.checkSearch()
		this.searchbar.element.onkeydown = event => event.key == "Enter" ? event.preventDefault() : null

		this.dropdown.onchange = () => {
			this.name = dropdown.value
			this.reloadPages()
		}

		this.buttonExpandRight.onclick = () => {
			let items = pages.childNodes
			let orderedIndices = []

			for(let i = items.length - 1; i >= 0; i--) {
				if(!items[i].style.display || items[i].style.display == "block")
					orderedIndices.push(i)
			}

			DividerUtils.expandAll(this.name, orderedIndices)
		}

		//Extra setup
		this.name = this.name
	}

	/**
	 * Sets current divider to the given value by changing the url and title to the given name
	 */
	set name(value) {
		location.hash = value
		document.getElementById("title").innerText = "(" + value + ") | Divider"
	}

	/**
	 * Gets the divider by the name in the url
	 */
	get name() {
		return decodeURIComponent(location.hash).substring(1)
	}

	/**
	 * Reloads the list containing the pages in the divider
	 */
	reloadPages() {
		let dividerPagePath = "dividers." + this.name + ".pages"

		//Remove all the existing pages
		while(this.pages.lastChild)
			this.pages.removeChild(pages.lastChild)

		//Populate the urls in the divider
		chrome.storage.local.get(dividerPagePath, pageItems => {
			//Get all the stored pages for the divider and place them in it
			const pages = pageItems[dividerPagePath]

			if(pages)
				pages.forEach(page => this.pages.appendChild(new Page(this, page).div))

			this.checkSearch()
		})
	}

	/**
	 * Reloads the list of available dividers to choose from to display
	 */
	reloadDropdownList() {
		while(dropdown.lastChild)
			dropdown.removeChild(dropdown.lastChild)

		chrome.storage.local.get("dividers", items => {
			items.dividers.forEach(divider => {
				let option = document.createElement("option")
				option.value = divider
				option.appendChild(document.createTextNode(divider))
				dropdown.add(option)
			})

			dropdown.value = this.name
		})
	}

	/**
	 * Checks the search query against the pages in the divider to determine which to show
	 */
	checkSearch() {
		//Get what is being searched for
		let query = this.searchbar.simplifyString(this.searchbar.element.value)
		let isRegex = query.startsWith("regex:"), isURL = query.startsWith("url:")

		//Make the searchbar text blue if it is using a special search
		this.searchbar.element.style.color = isRegex || isURL ? "navy" : "black"

		//Make all urls visible without hovering if the search begins with url: by adding the class searchResult
		if(isURL)
			document.querySelectorAll(".pageSpan").forEach(element => element.childNodes[2].classList.add("searchResult"))
		else
			document.querySelectorAll(".searchResult").forEach(element => element.classList.remove("searchResult"))

		//Check which pages should be shown based on their content
		pages.childNodes.forEach(div => {
			let spanNodes = div.firstChild.childNodes
			let title = this.searchbar.simplifyString(spanNodes[1].textContent)
			let url = this.searchbar.simplifyString(spanNodes[2].textContent)

			//Check the match and set visibility
			div.style.display = this.searchbar.matchSearch(query, title, url) ? "block" : "none"
		})
	}
}