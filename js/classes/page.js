import Divider from "/js/classes/divider.js"
import DividerUtils from "/js/classes/dividerutils.js"

export default class Page {
	/**
	 * @param {Divider} divider Divider that this page is in
	 * @param {string} page.title The page's title
	 * @param {string} page.url The page's url
	 * @param {number} page.time When the page was added to the divider
	 */
	constructor(divider, page) {
		this.divider = divider
		this.page = page

		//Create divider and text
		this.div = document.createElement("div")
		this.div.classList.add("page")

		//Add title
		this.title = document.createElement("span")
		this.title.classList.add("pageSpan")

		//Add expand button
		this.buttonExpand = document.createElement("button")
		this.buttonExpand.classList.add("pageButton")
		this.buttonExpand.title = "Expand " + page.title

		//Add link
		this.link = document.createElement("a")
		this.link.href = page.url
		this.link.appendChild(document.createTextNode("<" + page.url + ">"))

		//Spacer
		this.spacer = document.createElement("span")
		this.spacer.classList.add("pageSpacer")

		//Setup
		this.setupExpand()
		this.setupDragging()
		this.setupViewer()

		//Order elements
		this.title.appendChild(this.buttonExpand)
		this.title.appendChild(document.createTextNode(page.title))
		this.title.appendChild(this.link)
		this.div.appendChild(this.title)
		this.div.appendChild(this.spacer)
	}

	/**
	 * Gets the index of a page using its expand button
	 * @param {HTMLElement} button Expand button for a page
	 * @returns The index of the page in the divider
	 */
	getPageIndex(button) {
		return Array.from(this.divider.pages.children).indexOf(button.parentNode.parentNode)
	}

	/**
	 * Allows the page to be opened in a new tab by right-clicking the expand button
	 */
	setupExpand() {
		this.buttonExpand.oncontextmenu = event => {
			//Disable context menu
			event.preventDefault()

			//Open url in a new tab next to the same tab
			DividerUtils.expand(
				this.divider.name,
				this.getPageIndex(this.buttonExpand),
				"new"
			)
		}
	}

	/**
	 * Allows dragging on the expand button to reorganize
	 */
	setupDragging() {
		this.buttonExpand.draggable = true

		let removeOutlines = () => {
			document.querySelectorAll(".dragTarget, .dragSource").forEach(element => element.classList.remove("dragTarget", "dragSource"))
		}

		this.buttonExpand.ondragstart = event => {
			this.title.classList.add("dragSource")
			event.dataTransfer.effectAllowed = "move"
			event.dataTransfer.setData("divider_page_index", this.getPageIndex(this.buttonExpand))
		}

		this.buttonExpand.ondragend = event => removeOutlines()

		this.title.ondragover = event => {
			event.preventDefault()
			event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("divider_page_index") ? "move" : "none"
		}

		this.title.ondrop = event => {
			event.stopPropagation()
			let dividerPageIndex = event.dataTransfer.getData("divider_page_index")

			if(dividerPageIndex) {
				let dragIndex = parseInt(dividerPageIndex)
				let dropIndex = this.getPageIndex(this.buttonExpand)

				DividerUtils.reorderPage(this.divider.name, dragIndex, dropIndex < dragIndex ? dropIndex : (dropIndex + 1))
			}

			removeOutlines()
		}

		this.spacer.ondragover = event => {
			event.preventDefault()
			event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("divider_page_index") ? "move" : "none"
		}

		this.spacer.ondrop = event => {
			event.stopPropagation()
			let dividerPageIndex = event.dataTransfer.getData("divider_page_index")

			if(dividerPageIndex) {
				let dragIndex = parseInt(dividerPageIndex)
				let dropIndex = this.getPageIndex(this.buttonExpand)

				DividerUtils.reorderPage(this.divider.name, dragIndex, dropIndex + 1)
			}

			removeOutlines()
		}

		//Handle highlighting drop location
		this.spacer.ondragenter = event => this.spacer.classList.add("dragTarget")
		this.spacer.ondragleave = event => this.spacer.classList.remove("dragTarget")
		this.title.ondragenter = event => this.title.classList.add("dragTarget")
		this.title.ondragleave = event => event.fromElement != this.buttonExpand && event.fromElement != this.title ? this.title.classList.remove("dragTarget") : null
	}

	/**
	 * Allows the page to be opened within the divider by clicking the expand button
	 */
	setupViewer() {
		//Prevent interaction with iframe view while resizing to allow smoothness
		let viewer, resizeTimer
		let resizer = new ResizeObserver(() => {
			if(viewer != null) {
				clearTimeout(resizeTimer)
				viewer.style["pointer-events"] = "none" //Disable view interactions

				resizeTimer = setTimeout(() => {
					if(viewer != null)
						viewer.style["pointer-events"] = null //Reenable view interaction
				}, 100)
			}
		})

		//Create nav buttons for iframe
		let buttonBack = document.createElement("button")		
		buttonBack.classList.add("navButtonBack")
		buttonBack.innerHTML = "&#x2190;"
		buttonBack.onclick = () => viewer != null ? viewer.contentWindow.postMessage("back", "*") : null

		let buttonForward = document.createElement("button")
		buttonForward.classList.add("navButtonForward")
		buttonForward.innerHTML = "&#x2192;"
		buttonForward.onclick = () => viewer != null ? viewer.contentWindow.postMessage("forward", "*") : null

		let buttonRefresh = document.createElement("button")
		buttonRefresh.classList.add("navButtonRefresh")
		buttonRefresh.innerHTML = "&#x27f3;"
		buttonRefresh.onclick = () => viewer != null ? viewer.contentWindow.postMessage("reload", "*") : null

		let buttonFullscreen = document.createElement("button")
		buttonFullscreen.classList.add("navButtonFullscreen")
		buttonFullscreen.innerHTML = "&#x26f6"
		buttonFullscreen.onclick = () => viewer != null ? viewer.requestFullscreen() : null

		let buttonDelete = document.createElement("button")
		buttonDelete.classList.add("navButtonDelete")
		buttonDelete.innerHTML = "&#x00d7"
		buttonDelete.onclick = () => {
			DividerUtils.expand(
				this.divider.name,
				this.getPageIndex(button),
				"none"
			)
		}

		let navButtons = [buttonBack, buttonForward, buttonRefresh, buttonFullscreen, buttonDelete]
		
		//Set their css and append them to the spacer
		for(let i = 0; i < navButtons.length; i++) {
			let button = navButtons[i]
			button.classList.add("pageButton", "navButton")
			button.style.display = "none"

			this.spacer.appendChild(button)
		}

		//Left click button to open view
		this.buttonExpand.onclick = () => {
			viewer = this.div.querySelector("#viewer")

			//Toggle visibility of website
			if(viewer == null) {
				//Nav buttons
				for(let i = 0; i < navButtons.length; i++)
					navButtons[i].style.display = null

				//Viewable frame
				viewer = document.createElement("iframe")
				viewer.id = "viewer"
				viewer.src = this.page.url
				viewer.width = window.innerWidth * 0.6
				viewer.height = window.innerHeight * 0.5
				viewer.sandbox = "allow-forms allow-pointer-lock allow-popups allow-scripts allow-same-origin"
				viewer.setAttribute("allowFullScreen", "true")

				this.div.appendChild(viewer)
				resizer.observe(viewer)
			} else {
				resizer.unobserve(viewer)
				this.div.removeChild(viewer)

				for(let i = 0; i < navButtons.length; i++)
					navButtons[i].style.display = "none"
			}
		}
	}
}