//Splits a string a constrained amount of times
function constrainSplit(str, seperator, times) {
	//Split the string
	var splitString = str.split(":")

	//Concatenate the extras
	for(var i = times + 1; i < splitString.length; i++)
		splitString[times] = splitString[times].concat(seperator + splitString[i])

	//Return the array up to the amount of elements specified by times
	return splitString.slice(0, times + 1)
}

var dividerTabId = -1

chrome.tabs.getCurrent(
	function(tab) {
		console.log("Tab is " + tab.id)
		dividerTabId = tab.id
	}
)

chrome.runtime.onMessage.addListener(
	function(message, sender, sendResponse) {
		var name = document.getElementById("name").innerText

		if(name == message.name) {
			switch(message.command) {
				case "append":
					var div = document.createElement("div")
					var text = document.createElement("a")
					text.href = message.url

					var maxLength = 30
					var title = message.title
					if(title.length > maxLength)
						title = title.substring(0, maxLength) + "..."
					text.appendChild(document.createTextNode(title + " <" + message.url + ">"))

					div.appendChild(text)
					document.getElementById("items").appendChild(div)
					break
				default:
					console.log("Unable to identify divider commands")
					break
			}
		} else if(!name && message.command == "apply") {
			name = message.name

			document.getElementById("title").innerText = "(" + name + ") | Divider"
			document.getElementById("name").innerText = name
		}
	}
)

console.log("Loaded divider in tab " + dividerTabId)