const events = [
	"rename",
	"pagesChanged",
	"indexChanged",
	"delete"
]

export default class Divider {
	/** @type {string} */
	#name

	/** @type {Map.<DivEvent, Set.<DivCallback>>} */
	#subscribers

	/** @type {Map.<DivEvent, Map.<DivCallback, function(any):void>>} */
	#listeners

	/**
	 * @param {string} name Identifies the divider
	 */
	constructor(name) {
		this.#name = name
		this.#subscribers = new Map(events.map(v => [v, new Set()]))
		this.#listeners = new Map(events.map(v => [v, new Map()]))
	}

	/**
	 * Current name
	 */
	get name() {
		return this.#name
	}

	/**
	 * Name of every divider
	 * @type {Promise.<string[]>}
	 */
	static get all() {
		return new Promise(resolve => chrome.storage.local.get(
			"dividers",
			result => {
				let names = result?.dividers ?? []
				resolve(names instanceof Array ? names : [names])
			}
		))
	}

	/**
	 * Maximum number of pages that should be expanded at once
	 * 
	 * NaN indicates no limit
	 * @type {number}
	 */
	static get expandLimit() {
		return 30
	}

	/**
	 * Threshold for number of pages that may be expanded before requesting confirmation from the user
	 * 
	 * @type {number}
	 */
	static get expandThreshold() {
		return 10
	}

	/**
	 * Rename to the given value
	 * @param {string} value New name
	 * @return {Promise.<boolean>} Whether renaming was possible
	 */
	async rename(value) {
		let names = await Divider.all

		//Keep old name if new name is empty, same as old name, or a divider exists with the new name
		if(value.length == 0 || value == this.#name || names.indexOf(value) != -1)
			return false


		let index = names.indexOf(this.#name)

		if(index == -1)
			return false

		//Replace old name with new name in dividers list
		names.splice(index, 1, value)
		await new Promise(resolve => chrome.storage.local.set(
			{dividers: names},
			() => resolve()
		))

		//Copy pages into new divider and delete old divider's pages
		let pages = this.getPages()
		chrome.storage.local.remove(`dividers.${this.#name}.pages`)
		await new Promise(resolve => chrome.storage.local.set(
			{[`dividers.${value}.pages`]: pages},
			() => resolve()
		))

		await this.#fire("rename", {oldName: this.#name, newName: value})

		//Change name for this instance
		this.#name = value

		return true
	}

	/**
	 * @return {Promise.<Page[]>} List of pages in the divider
	 */
	async getPages() {
		let path = `dividers.${this.#name}.pages`
		let items = await new Promise(resolve => chrome.storage.local.get(
			path,
			result => resolve(result[path])
		))

		return items instanceof Array ? items : [items]
	}

	/**
	 * @param {Page[]} value New list of pages
	 */
	async setPages(value) {
		await new Promise(resolve => chrome.storage.local.set(
			{[`dividers.${this.#name}.pages`]: value},
			() => resolve()
		))

		await this.#fire("pagesChanged", value)
	}

	/**
	 * @returns {Promise.<number>} Index of the divider used to determine its order
	 */
	async getIndex() {
		return (await Divider.all).indexOf(this.#name)
	}

	/**
	 * Sets the divider's order index
	 * @param {number} value New index
	 */
	async setIndex(value) {
		let names = await Divider.all

		let index = await this.getIndex()
		names.splice(index, 1)
		names.splice(value, 0, this.#name)

		await new Promise(resolve => chrome.storage.local.set(
			{dividers: names},
			() => resolve()
		))

		await this.#fire("indexChanged", {oldIndex: index, newIndex: value})
	}

	/**
	 * 
	 * @param {number|function(object, object):boolean} predicate Tab id or tab comparison function to determine which tabs are compressed
	 */
	async compress(predicate) {
		let pages = await this.getPages()

		switch(typeof predicate) {
			case "number":
				//Save and remove targeted tab
				let tab = await new Promise(r => chrome.tabs.get(predicate, tab => r(tab)))

				pages.unshift({
					time: Date.now(),
					title: tab.title ?? "[Unknown]",
					url: tab.url
				})

				await this.setPages(pages)
				await new Promise(r => chrome.tabs.remove(tab.id, () => r()))
				break
			case "function":
				//Save and remove tabs matching the predicate
				let currentTab = await new Promise(r => chrome.tabs.getCurrent(tab => r(tab)))
				let tabs = await new Promise(r => chrome.tabs.query(
					{
						"currentWindow": true,
						"pinned": false
					},
					tabs => r(tabs)
				))

				//Filter tabs based on predicate function
				let chosen = tabs.filter(tab => tab.index != currentTab.index && predicate(currentTab, tab))

				//Save chosen
				for(let tab of chosen)
					pages.unshift({
						time: Date.now(),
						title: tab.title ?? "[Unknown]",
						url: tab.url
					})

				//Remove chosen tabs
				await this.setPages(pages)
				await new Promise(r => chrome.tabs.remove(chosen.map(tab => tab.id), () => r()))
				break
		}
	}

	/**
	 * Opens the pages in new tabs to the right of the current tab
	 * 
	 * This action removes the pages from the divider
	 * @param {...number} indices Index or indices of the page(s) to be expanded
	 */
	async expand(...indices) {
		let pages = await this.getPages()
		let tab = await new Promise(r => chrome.tabs.getSelected(tab => r(tab)))

		for(let index of indices.sort((a, b) => b - a)) {
			let [page] = pages.splice(index, 1)
			let {url} = page

			chrome.tabs.create({
				url: url,
				active: false,
				index: tab.index + 1
			})
		}

		await this.setPages(pages)
	}

	/**
	 * Opens a page
	 * @param {number} index Page index
	 * @param {boolean} navigate True to update the current tab, false to open a new tab
	 * @param {boolean} expand Whether to remove the page from the divider
	 */
	async open(index, navigate = true, expand = true) {
		let pages = await this.getPages()

		let [page] = pages.splice(index, 1)
		let {url} = page

		if(navigate)
			chrome.tabs.update({url: url})
		else {
			let tab = await new Promise(r => chrome.tabs.getSelected(tab => r(tab)))

			chrome.tabs.create({
				url: url,
				active: true,
				index: tab.index + 1
			})
		}

		if(expand)
			await this.setPages(pages)
	}

	/**
	 * Deletes this divider permanently
	 * @return {Promise.<boolean>} Whether the divider was deleted
	 */
	async delete() {
		let names = await Divider.all

		let index = names.indexOf(this.#name)

		if(index == -1)
			return false

		names.splice(index, 1)

		await new Promise(resolve => chrome.storage.local.set(
			{dividers: names},
			() => resolve()
		))

		await new Promise(resolve => chrome.storage.local.remove(
			[`dividers.${this.#name}.pages`],
			() => resolve()
		))
		
		this.#fire("delete")

		return true
	}

	/**
	 * Exports a txt containing the title and url of all the pages in the divider
	 */
	async exportUrls() {
		let pages = await this.getPages()
		let data = pages.map(page => {
			let {title, url} = page
			return `${title}: ${url}`
		}).join("\r\n\r\n")

		let link = document.createElement("a")
		link.href = URL.createObjectURL(new Blob([data], {type: "text"}))
		link.download = `${this.#name}.txt`
		link.click()
	}

	/**
	 * Register a callback for an event regarding this divider
	 * @param {DivEvent} event Event type to listen for
	 * @param {DivCallback} callback Function to be called when the event fires
	 */
	on(event, callback) {
		let listener = message => {
			if(message.event != "divider" || message.target != this.#name || message.type != event)
				return

			callback(message.data)
		}

		this.#subscribers.get(event).add(callback)
		this.#listeners.get(event).set(callback, listener)
		chrome.runtime.onMessage.addListener(listener)
	}

	/**
	 * Register a callback for an event regarding this divider
	 * @param {DivEvent} event Event type to listen for
	 * @param {DivCallback} callback Function to be called when the event fires
	 */
	removeCallback(event, callback) {
		this.#subscribers.get(event).delete(callback)

		let lreg = this.#listeners.get(event)
		if(lreg.has(callback))
			chrome.runtime.onMessage.removeListener(lreg.get(callback))
	}

	/**
	 * Removes all callbacks
	 */
	removeCallbacks() {
		for(let entry of this.#subscribers) {
			let [, registry] = entry
			registry.clear()
		}

		for(let entry of this.#listeners) {
			let [, registry] = entry

			for(let e of registry) {
				let [, listener] = e
				chrome.runtime.onMessage.removeListener(listener)
			}
		}
	}

	/**
	 * Fire an event
	 * @param {DivEvent} event 
	 * @param {DivEventData} data 
	 */
	#fire = async (event, data = null) => {
		for(let callback of this.#subscribers.get(event))
			await callback(data)

		chrome.runtime.sendMessage({
			"event": "divider",
			"target": this.#name,
			"type": event,
			"data": data
		})
	}

	/**
	 * @param {string} name Divider name
	 * @returns {Divider} Existing divider for the given name
	 */
	static for(name) {
		return new Divider(name)
	}

	/**
	 * @param {string} name Creates a new divider if it doesnt exist
	 * @return {Promise.<Divider>} The newly created divider
	 */
	static async create(name = null) {
		let names = await Divider.all

		if(name == null) {
			let index = 0
			name = "New Divider"

			while(names.indexOf(name) != -1)
				name = `New Divider ${++index}`
		} else if(names.some(n => n == name))
			return new Divider(name)

		names.push(name)

		await new Promise(resolve => chrome.storage.local.set(
			{dividers: names},
			() => resolve()
		))

		let divider = new Divider(name)
		divider.setPages([])
		
		return divider
	}

	/**
	 * Opens the divider
	 * @param {string} name Divider name
	 * @param {boolean} redirect Whether to open the divider in this tab or open a new tab for it
	 */
	static open(name, redirect = false) {
		let url = `divider.html#${name}`

		if(redirect)
			chrome.tabs.update({url: url})
		else
			chrome.tabs.create({url: url})
	}

	/**
	 * Exports a json config of all the dividers and options
	 */
	static async exportConfig() {
		let items = await new Promise(r => chrome.storage.local.get(null, items => r(items)))
		let data = JSON.stringify(items, null, "\t")

		let link = document.createElement("a")
		link.href = URL.createObjectURL(new Blob([data], {type: "text/json"}))
		link.download = "Tabs Config.json"
		link.click()
	}
}

/**
 * @typedef {{time: number, title: string, url: string}} Page Time, title, and url
 * @typedef {string} DivEvent
 * @typedef {any} DivEventData
 * @typedef {function(DivEventData):Promise.<void>} DivCallback
 */