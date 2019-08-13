export default class Searchbar {
	/**
	 * @param {HTMLElement} searchbarElement The textarea used as a searchbar
	 */
	constructor(searchbarElement) {
		this.element = searchbarElement
	}

	/**
	 * @param {string} str The string to be simplified
	 * @returns Simplified form of the string to be used for searchs
	 */
	simplifyString(str) {
		return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
	}

	/**
	 * @param {string} query The string to match for
	 * @param {string} title The page's title
	 * @param {string} url The page's url
	 * @returns Whether the query matches or not
	 */
	matchSearch(query, title, url) {
		if(query.length == 0)
			return true
		
		if(query.startsWith("regex:")) {
			try {
				if(new RegExp(query.substring(6)).test(title))
					return true
				else
					return false
			} catch(error) {
				searchbar.style.color = "orangered"
			}
		}
		
		if(query.startsWith("url:")) {
			if(url.includes(query.substring(4)))
				return true
			else
				return false
		}

		if(title.includes(query))
			return true
		
		return false
	}
}