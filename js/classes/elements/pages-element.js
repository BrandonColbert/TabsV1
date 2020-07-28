import ReorderList from "../view/reorder-list.js"
import Divider from "../divider.js"
import PageFilter from "../filters/page-filter.js"

/**
 * Displays a dividers pages
 */
export default class PagesElement {
	/** @type {HTMLDivElement} */
	#element

	/** @type {ReorderList} */
	#reorderList

	/** @type {Divider} */
	#divider = null

	/** @type {string} */
	#currentQuery = ""

	/** @type {PageFilter} */
	#currentFilter = new PageFilter()

	/** @type {Map.<string, PageFilter>} */
	#filters = new Map()

	/**
	 * @param {HTMLDivElement} element 
	 */
	constructor(element) {
		this.#element = element
		this.#reorderList = new ReorderList(element)
		this.#reorderList.callback = async (from, to) => {
			let pages = await this.#divider.getPages()
			let page = pages[from]

			pages.splice(from, 1)
			pages.splice(to, 0, page)

			this.#divider.setPages(pages)
		}
	}

	/** Bound html element */
	get element() {
		return this.#element
	}

	/** Current filter being used */
	get currentFilter() {
		return this.#currentFilter
	}

	/** Filters being used */
	get filters() {
		return [...this.#filters.values()]
	}

	/**
	 * Indices of the visible pages
	 * @type {number[]}
	 */
	get visibleIndices() {
		let length = this.#element.children.length
		let indices = []

		for(let i = 0; i < length; i++) {
			let page = this.#element.children[i]

			if(!page.style.display || page.style.display == "block")
				indices.push(i)
		}

		return indices
	}

	/** Divider whose pages are being displayed */
	get divider() {
		return this.#divider
	}

	/**
	 * @param {Divider} value New divider to display
	 */
	async setDivider(value) {
		this.#divider = value
		await this.refresh()
	}

	/**
	 * Refreshes displayed pages
	 * @param {import("../divider").Page[]} pages 
	 */
	async refresh(pages = null) {
		pages = pages ?? await this.#divider.getPages() ?? []
		let children = this.#element.children

		while(children.length > pages.length)
			this.#element.lastChild.remove()

		for(let i = Math.min(pages.length, children.length) - 1; i >= 0; i--)
			this.#bindPageElement(children[i], pages[i])

		while(children.length < pages.length) {
			let e = this.#createPageElement(pages[children.length])
			this.#element.append(e)
			this.#reorderList.integrate(e, "button")
		}

		await this.filter(this.#currentQuery)
	}

	/**
	 * Registers a filter(s) to be used when processing queries
	 * @param {...PageFilter} filter Filter to add
	 */
	addFilter(...filters) {
		for(let filter of filters)
			for(let alias of filter.aliases)
				this.#filters.set(alias, filter)
	}

	/**
	 * Filters visible pages based on a search query
	 * @param {string} query Query to filter items based on
	 * @return {Promise.<"pass"|"fail"|"special">} Query result
	 */
	async filter(query) {
		this.#currentQuery = query
		let prefix = ""

		if(query.startsWith(":")) {
			let [p] = query.split(" ", 1)
			prefix = p.substring(1)
			query = prefix.length > 0 ? query.substring(p.length + 1) : ""
		}

		this.#currentFilter = (prefix.length + query.length) > 0 && this.#filters.has(prefix) ? this.#filters.get(prefix) : new PageFilter()

		let pages = await this.#divider.getPages() ?? []
		let indices = this.#currentFilter.match(query, pages)

		if(!indices)
			return "fail"
		
		let matched = new Set(indices)
		matched.delete(NaN)

		for(let i = this.#element.children.length - 1; i >= 0; i--) {
			let e = this.#element.children[i]
			e.style.display = matched.has(i) ? null : "none"

			this.#bindPageElement(e, this.#currentFilter.toDisplay(pages[i]))
		}

		return prefix && this.#filters.has(prefix) ? "special" : "pass"
	}

	/**
	 * @param {import("../divider").Page} page 
	 */
	#createPageElement = page => {
		let element = document.createElement("div")
		element.classList.add("page")

		let getInteractIndex = e => Array.from(this.#element.children).indexOf(e.parentNode)

		let interact = document.createElement("button")
		interact.classList.add("pageButton")

		interact.addEventListener("click", async e => {
			e.preventDefault()
			await this.#divider.open(getInteractIndex(e.target), false, false)
		})

		interact.addEventListener("contextmenu", async e => {
			e.preventDefault()
			await this.#divider.expand(getInteractIndex(e.target))
		})

		element.append(interact)
		element.append(document.createElement("div"))

		this.#bindPageElement(element, page)

		return element
	}

	/**
	 * @param {HTMLElement} element
	 * @param {import("../divider").Page} page 
	 */
	#bindPageElement = (element, page) => {
		let {title, url} = page

		let interact = element.querySelector(":nth-child(1)")
		interact.title = url

		let text = element.querySelector(":nth-child(2)")
		text.textContent = title
		text.title = title
	}
}