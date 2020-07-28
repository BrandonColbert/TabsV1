/** Filter for pages to be displayed */
export default class PageFilter {
	/**
	 * Other names to refer to this filter
	 * @type {string[]}
	 */
	get aliases() {
		return []
	}

	/** Description of this filter */
	get description() {
		return ""
	}

	/**
	 * @param {string} query Query to match with
	 * @param {import("../divider").Page[]} pages Pages to filter
	 * @returns {number[]} Indices of pages that matched
	 */
	match(query, pages) {
		return Array.from({length: pages.length}, (_, k) => k)
	}

	/**
	 * @param {import("../divider").Page[]} page Original page
	 * @returns {Page} Page seen by the user
	 */
	toDisplay(page) {
		return page
	}

	/**
	 * @param {string} value String to simplify
	 * @returns {string} Simplified version of original string
	 */
	static simplifyString(value) {
		return value
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
	}
}