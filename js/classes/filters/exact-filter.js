import PageFilter from "./page-filter.js"

export default class ExactFilter extends PageFilter {
	get aliases() {
		return [
			"",
			"cont",
			"continuous",
			"exact",
			"full",
			"precise"
		]
	}

	/**
	 * @param {string} query
	 * @param {import("../divider").Page[]} pages
	 */
	match(query, pages) {
		query = PageFilter.simplifyString(query)
		return pages.map((v, i) => PageFilter.simplifyString(v.title).includes(query) ? i : NaN)
	}
}