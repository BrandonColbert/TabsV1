import PageFilter from "./page-filter.js"

export default class SetFilter extends PageFilter {
	get aliases() {
		return [
			"has",
			"includes",
			"partial",
			"set",
			"some",
		]
	}

	get description() {
		return "Matches when all of the space separated terms are found in the title"
	}

	/**
	 * @param {string} query
	 * @param {import("../divider").Page[]} pages
	 */
	match(query, pages) {
		query = PageFilter.simplifyString(query)

		let terms = query.split(" ")

		return pages.map((v, i) => {
			let title = PageFilter.simplifyString(v.title)

			for(let term of terms) {
				if(term.startsWith("-")) {
					term = term.substring(1)

					if(term && title.includes(term))
						return NaN
				} else if(!title.includes(term))
					return NaN
			}

			return i
		})
	}
}