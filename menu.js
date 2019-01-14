var htmlDividers = document.getElementById("tab-dividers")

class Divider {
	constructor(name) {
		this.name = name
		this.categoryId = "tabs-category-" + name

		if(!(name in Divider.dividers))
			Divider.dividers[name] = []

		if(document.getElementById(this.categoryId) == null) {
			var div = document.createElement("details")
			var sum = document.createElement("summary")
			var txt = document.createTextNode(name)

			sum.appendChild(txt)
			div.appendChild(sum)
			htmlDividers.appendChild(div)

			div.id = this.categoryId
		}
	}

	add(item) {
		Divider.dividers[this.name].push(item)

		var itemId = "tabs-category-item-" + item

		if(document.getElementById(itemId) == null) {
			var tabItem = document.createElement("p")
			var tabName = document.createTextNode(item)

			tabItem.appendChild(tabName)
			document.getElementById(this.categoryId).appendChild(tabItem)

			tabItem.id = itemId
		}

		return this
	}

	remove(item) {
		var divider = Divider.dividers[this.name]
		divider.splice(divider.indexOf(item), 1)

		return this
	}
}

function getDivider(name) {
	if(Divider.dividers == null || Divider.instances == null)
		Divider.dividers = {}
		Divider.instances = {}

	if(!(name in Divider.instances))
		Divider.instances[name] = new Divider(name)

	return Divider.instances[name]
}

getDivider("YouTube").add("user/LinusTechTips").add("user/BlueXephos").add("user/Vsauce")
getDivider("Reddit").add("r/All").add("r/Aww").add("r/AskScience")
getDivider("StackOverflow")
getDivider("GitHub")
getDivider("TheVerge")

console.log(Divider.dividers)