function receive(message) {
	switch(message.command) {
		case "apply":
			document.getElementById("title").innerText = "(" + message.name + ") | Divider"
			document.getElementById("name").innerText = message.name
			break
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
}

chrome.runtime.onMessage.addListener(
	function(message, sender, sendResponse) {
		receive(message)
	}
)