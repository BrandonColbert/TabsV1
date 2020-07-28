import PageFilter from "./page-filter.js"

export default class UrlFilter extends PageFilter {
	get aliases() {
		return [
			"address",
			"link",
			"site",
			"url"
		]
	}

	get description() {
		return "Matches when the phrase is contained in the url"
	}

	/**
	 * @param {string} query
	 * @param {import("../divider").Page[]} pages
	 */
	match(query, pages) {
		query = PageFilter.simplifyString(query)
		return pages.map((v, i) => PageFilter.simplifyString(v.url).includes(query) ? i : NaN)
	}

	/**
	 * @param {import("../divider").Page[]} page
	 */
	toDisplay(page) {
		return {
			title: page.url,
			url: page.title
		}
	}
}