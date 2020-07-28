import PageFilter from "./page-filter.js"

export default class NotFilter extends PageFilter {
	get aliases() {
		return [
			"anti",
			"exclude",
			"not",
			"opposite",
			"without"
		]
	}

	get description() {
		return "Matches when the phrase is not contained in the title"
	}

	/**
	 * @param {string} query
	 * @param {import("../divider").Page[]} pages
	 */
	match(query, pages) {
		query = PageFilter.simplifyString(query)
		return new Set(pages.map((v, i) => PageFilter.simplifyString(v.title).includes(query) ? NaN : i))
	}
}