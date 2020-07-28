import PageFilter from "./page-filter.js"

export default class RegexFilter extends PageFilter {
	get aliases() {
		return [
			"regex",
			"regexp",
			"regularexpression"
		]
	}

	get description() {
		return "Matches when regex is applicable to the title"
	}

	/**
	 * @param {string} query
	 * @param {import("../divider").Page[]} pages
	 */
	match(query, pages) {
		try {
			let regex = new RegExp(query)
			return pages.map((v, i) => regex.test(PageFilter.simplifyString(v.title)) ? i : NaN)
		} catch(e) {
			return null
		}
	}
}