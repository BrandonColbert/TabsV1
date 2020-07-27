const defaultOptions = new Map([
	["exportPageRule", "{title} <{url}>\r\n"],
	["deleteConfirmation", true],
	["expandLimit", 30],
	["expandThreshold", 10]
])

export default class Tabs {
	/**
	 * @return {Promise.<Options>}
	 */
	static get options() {
		return new Promise(resolve => chrome.storage.local.get(
			"options",
			items => resolve(items.options)
		))
	}

	/**
	 * @param {OptionKey} key Key the option is stored under
	 * @param {OptionValue} value Default value to none found
	 * @return {OptionValue} Value for the option
	 */
	static async getOption(key, defaultValue = null) {
		let options = await Tabs.options

		if(key in options)
			return options[key]
		if(defaultValue != null)
			return defaultValue
		if(defaultOptions.has(key))
			return defaultOptions.get(key)

		return null
	}

	/**
	 * Sets new option values
	 * @param {OptionEntry[]} values New options to be overridden
	 */
	static async setOption(...entries) {
		let options = await Tabs.options

		for(let entry of entries) {
			let [key, value] = entry
			options[key] = value
		}

		return await new Promise(resolve => chrome.storage.local.get(
			{options: options},
			items => resolve(items.options)
		))
	}

	/**
	 * Imports a Tabs configuration file
	 * @param {string} url Url for config file or null to prompt user to upload one
	 * @returns {Promise.<boolean>} Whether the config could be imported
	 */
	static async importConfig(url = null) {
		let text = null

		if(url) {
			try {
				text = await (await fetch(url)).text()
			} catch(_) {}
		} else {
			let input = document.createElement("input")
			input.type = "file"

			text = await new Promise(resolve => {
				let timeout = null

				input.onchange = e => {
					if(timeout)
						clearTimeout(timeout)

					let [file] = e.target.files				
					e.target.remove()

					let reader = new FileReader()
					reader.onload = e => resolve(e.target.result)
					reader.readAsText(file)
				}

				window.addEventListener(
					"focusin",
					() => timeout = setTimeout(() => resolve(null), 200),
					{once: true}
				)

				input.click()
			})
		}

		if(!text)
			return false

		let config = JSON.parse(text)
		await new Promise(r => chrome.storage.local.set(config, () => r()))

		return true
	}

	/** Exports a json config of all the dividers and options */
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
 * @typedef {string} OptionKey
 * @typedef {boolean|number|string} OptionValue 
 * @typedef {{key: OptionKey, value: OptionValue}} OptionEntry
 * @typedef {object} Options
 * @property {boolean} allow_duplicates
 */