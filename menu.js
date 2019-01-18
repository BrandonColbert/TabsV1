import * as DividerUtils from "/DividerUtils.js"

function createPageElement(page) {
	//Create the button for the page and define actions for clicking it
	var tabItem = document.createElement("button")
	tabItem.appendChild(document.createTextNode(page.title))

	//Navigate to page on left-click
	tabItem.addEventListener("click", () => {
		DividerUtils.expand(
			tabItem.parentElement.firstChild.innerText,
			Array.from(tabItem.parentNode.children).indexOf(tabItem) - 1, //Account that summary is also a child
			true
		)
	})

	//Open in new tab on right-click
	tabItem.addEventListener("contextmenu", event => {
		//Disable context menu
		event.preventDefault()

		//Open url in a new tab next to the same tab
		DividerUtils.expand(
			tabItem.parentElement.firstChild.innerText,
			Array.from(tabItem.parentNode.children).indexOf(tabItem) - 1, //Account that summary is also a child
			false
		)
	})

	return tabItem
}

function createDivider(name) {
	//Get the page path based on the name
	var dividerPagePath = "dividers." + name + ".pages"

	//Create the dividers details and assign it the same id as its page path
	var details = document.createElement("details")
	details.id = dividerPagePath

	//Make the name the same as the divider name
	var summary = document.createElement("summary")

	//Right click text to edit divider name
	var dividerName = document.createElement("text")
	dividerName.dataset.original = name

	dividerName.addEventListener("contextmenu", event => {
		//Disable context menu
		event.preventDefault()

		//Make editable and focus
		dividerName.contentEditable = true
		dividerName.focus()

		//Select all text
		var range = document.createRange()
		range.selectNodeContents(dividerName)
		window.getSelection().removeAllRanges()
		window.getSelection().addRange(range)
	})

	dividerName.addEventListener("keydown", event => {
		if(event.code == "Escape") { //Escape to leave text as original
			//Prevent exiting extension
			event.preventDefault()
			
			dividerName.contentEditable = false
			dividerName.textContent = dividerName.dataset.original
		} else if(event.code == "Enter") { //Enter to rename
			dividerName.contentEditable = false

			//Try renaming and revert name if callback result is false
			DividerUtils.rename(dividerName.dataset.original, dividerName.textContent, result => {
				if(!result)
					dividerName.textContent = dividerName.dataset.original
			})
		}
	})

	dividerName.addEventListener("focusout", () => {
		//Unselecting while editing leaves text as original
		if(dividerName.contentEditable == "true") {
			dividerName.contentEditable = false
			dividerName.textContent = dividerName.dataset.original
		}
	})

	dividerName.addEventListener("click", event => {
		//Prevent toggling open status while renaming
		if(dividerName.contentEditable == "true")
			details.open = !details.open
	})

	//Show button to navigate to the divider's page
	var pageButton = document.createElement("button")
	pageButton.classList.add("pageButton")

	pageButton.addEventListener("click", () => {
		//Open divider with the divider's name as metadata
		DividerUtils.open(dividerName.dataset.original, false)
	})

	//Display them properly in html
	dividerName.appendChild(document.createTextNode(name))
	summary.appendChild(pageButton)
	summary.appendChild(dividerName)
	details.appendChild(summary)
	document.getElementById("tab-dividers").appendChild(details)

	//Populate the urls in the divider
	chrome.storage.local.get(dividerPagePath, pageItems => {
		//Get all the stored pages for the divider and place them in it
		pageItems[dividerPagePath].forEach(page => {
			details.appendChild(createPageElement(page))
		})
	})
}

//Initialize with dividers and items preadded
chrome.storage.local.get("dividers", items => {
	//Iterate through stored divider names
	items.dividers.forEach(element => createDivider(element))
})

//Update the view in case it is changed somewhere
chrome.storage.onChanged.addListener((changes, areaName) => {
	//Regex to make sure the change involves a divider page
	var regexDividerPage = RegExp("^dividers\\..*\\.pages$")

	//Get all the keys that were changed
	for(var key in changes) {
		var oldValue = changes[key].oldValue
		var newValue = changes[key].newValue

		if(regexDividerPage.test(key)) { //Check if divider page was changed
			if(oldValue && newValue) {
				var divider = document.getElementById(key)

				//Remove all the children from details besides the summary name
				while(divider.childElementCount > 1)
					divider.removeChild(divider.lastChild)

				//Add the new titles
				newValue.forEach(page => divider.appendChild(createPageElement(page)))
			}
		} else if(key == "dividers") {
			if(oldValue.length == newValue.length) { //A rename or reorder occured
				var symDiff = oldValue
					.filter(dividerName => !newValue.includes(dividerName))
					.concat(newValue.filter(dividerName => !oldValue.includes(dividerName)))

				if(symDiff.length > 0) { //A rename occured
					for(var i = 0; i < newValue.length; i++) {
						var oldName = oldValue[i]
						var newName = newValue[i]

						if(oldName != newName) {
							var details = document.getElementById("dividers." + oldName + ".pages")
							details.id = "dividers." + newName + ".pages"

							var dividerText = details.firstChild.childNodes[1]
							dividerText.dataset.original = newName
							dividerText.textContent = newName
						}
					}
				} else { //A reorder occured
					console.log("Divider reorder | changes:")
					console.log(changes)
				}
			} else { //A removal or addition occured
				if(oldValue.length < newValue.length) { //Addition
					console.log("Divider addition")
				} else { //Removal
					console.log("Divider removal")
				}

				var pages = document.getElementById("tab-dividers").children

				var extract = RegExp("^dividers\\.|\\.pages$")
				var oldNames = []

				for(var i = 0; i < pages.length; i++) {
					var element = pages[i]
					var name = element.id.replace(extract, "").replace(extract, "")
					oldNames.push(name)

					//Remove if the divider name is not found in the new version
					if(!newValue.includes(name)) {
						element.remove()
						i--
					}
				}

				//Handle adding
				for(var name in newValue) {
					if(!oldNames.includes(name)) {
						console.log(name + " is new")
					}
				}

				//Reorder


				//TODO: Check menu.js, divider.js, and tabs.js for when dividers or their pages are reordered
			}
		}
	}
})