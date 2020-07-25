const image = new Image()

/**
 * Enables reordering of an unsorted list through dragging
 */
export default class ReorderList {
	/**
	 * Class to apply to the dragged element
	 * @type {string}
	 */
	dragClass

	/**
	 * Callback when an item is re-ordered
	 * @type {ReorderCallback}
	 */
	callback

	/** @type {HTMLElement} */
	#listElement

	/** @type {HTMLElement} */
	#activeElement

	/** @type {HTMLElement} */
	#initialIndex

	/**
	 * @param {HTMLElement} list List container element
	 */
	constructor(list) {
		this.#listElement = list

		for(let element of list.children)
			this.integrate(element)
	}

	/** List element attached to */
	get element() {
		return this.#listElement
	}

	/**
	 * Integrates a new element
	 * @param {HTMLElement} element 
	 * @param {string} selector Query selector to only allow dragging on specific children
	 */
	integrate(element, selector = "") {
		element.ondragstart = e => {
			let target = this.#getParentListItem(e.target)
			if(!target)
				return

			e.dataTransfer.dropEffect = "move"
			e.dataTransfer.setDragImage(image, 0, 0)

			if(this.dragClass)
				target.classList.add(this.dragClass)

			this.#activeElement = target
			this.#initialIndex = Array.from(this.#listElement.children).indexOf(target)
		}

		element.ondragover = e => e.preventDefault()

		element.ondragenter = e => {
			let target = this.#getParentListItem(e.target)
			if(!target)
				return

			let children = Array.from(this.#listElement.children)
			let active = this.#activeElement

			this.#listElement.insertBefore(
				active,
				children.indexOf(active) < children.indexOf(target) ? target.nextSibling : target
			)
		}

		element.ondragend = async e => {
			let target = this.#getParentListItem(e.target)
			if(!target)
				return

			if(this.dragClass)
				target.classList.remove(this.dragClass)

			if(this.callback) {
				let endIndex = Array.from(this.#listElement.children).indexOf(target)

				if(this.#initialIndex != endIndex)
					await this.callback(this.#initialIndex, endIndex)
			}
		}

		if(selector)
			for(let e of element.querySelectorAll(selector))
				e.draggable = true
		else
			element.draggable = true
	}

	/**
	 * @param {HTMLElement} element 
	 * @returns {HTMLElement}
	 */
	#getParentListItem = element => {
		while(element.parentNode && element.parentNode != this.#listElement)
			element = element.parentNode

		return element
	}
}

/** @typedef {function(number, number):void} ReorderCallback */