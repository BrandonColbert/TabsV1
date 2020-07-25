/**
 * Displays a dropdown menu
 */
export default class Dropdown {
	static dropdownClass = "dropdown"

	/**
	 * Create a dropdown menu
	 * @param {object[]} items Items in the menu
	 * @param {string} items.text Item text
	 * @param {function(MouseEvent):Promise.<void>} [items.callback] Callback on click
	 * @param {object} [options] Configuration options
	 * @param {number} [options.height] Max height in pixels before scrolling is enabled
	 * @param {number[]} [options.position] xy position of dropdown
	 * @param {HTMLElement} [options.target] Element to position under
	 * @returns {HTMLElement} The created dropdown
	 */
	static create(items, options) {
		let dropdown = document.createElement("div")
		dropdown.tabIndex = -1
		document.body.appendChild(dropdown)
		
		let close = () => {
			window.removeEventListener("keydown", keyListener)
			dropdown.removeEventListener("blur", blurListener)
			dropdown.remove()
		}

		let keyListener = e => {
			switch(e.keyCode) {
				case 27: //Escape
					close()
					break
			}
		}

		let blurListener = e => {
			if(e.relatedTarget == dropdown || e.relatedTarget?.parentNode == dropdown)
				return

			close()
		}

		if(options?.height) {
			dropdown.style.overflowY = "auto"
			dropdown.style.maxHeight = options.height
		}

		for(let item of items) {
			let button = document.createElement("button")
			button.appendChild(document.createTextNode(item.text))

			button.addEventListener("blur", blurListener)
			button.addEventListener("click", async e => {
				button.removeEventListener("blur", blurListener)

				if(item.callback)
					await item.callback(e)

				close()
			})

			dropdown.appendChild(button)
		}

		dropdown.classList.add(Dropdown.dropdownClass)

		let [x, y] = ["0px", "0px"]

		if(options?.position)
			[x, y] = options.position
		else if(options?.target) {
			let [width, height] = [dropdown.clientWidth, dropdown.clientHeight / items.length]
			let rect = options.target.getBoundingClientRect()
			let [left, top] = [rect.x, rect.bottom]
			let [right, bottom] = [left + width, top + height]
			let [windowWidth, windowHeight] = [window.innerWidth, window.innerHeight]

			x = `${right > windowWidth ? left + rect.width - width : left}px`
			y = `${bottom > windowHeight ? rect.top - height : top}px`
		}

		dropdown.style.left = x
		dropdown.style.top = y

		window.addEventListener("keydown", keyListener)
		dropdown.addEventListener("blur", blurListener)
		dropdown.focus()

		return dropdown
	}
}