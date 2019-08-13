export default class URLEvaluator {
	/**
	 * Evalutates what url should be derived and saved based on the website
	 * @param tab Tab for the url
	 * @return A promise yielding the url
	 */
	static evluate(tab) {
		let url = tab.url

		if(/^https:\/\/www.youtube.com\/watch\?/.test(url)) { //Check if youtube and return url with current timestamp
			return new Promise((resolve, reject) => {
				const retrieveURL = (msg, sender) => {
					if(sender.url == url && msg.event == "evaluateURL") {
						chrome.runtime.onMessage.removeListener(retrieveURL)

						if(msg != null && msg.url.length > 0)
							url = msg.url

						resolve(url)
					}
				}

				chrome.runtime.onMessage.addListener(retrieveURL);

				chrome.tabs.executeScript(tab.id, {
					code: `
						const sendURL = msg => {
							if(msg.origin === (window.location.protocol + "//" + window.location.hostname)) {
								window.removeEventListener("message", sendURL)

								chrome.runtime.sendMessage({
									"event": "evaluateURL",
									"url": msg.data
								})
							}
						}

						window.addEventListener("message", sendURL)

						if(document.readyState === "complete") { //Try getting the video with timestamp if page is loaded
							let script = document.createElement("script")
							let code = \`
								let player = document.getElementById("movie_player")
								let url = player != null ? player.getVideoUrl().replace(/t=.*&/, "t=" + Math.floor(player.getCurrentTime()) + "&") : null
								window.postMessage(url, "*")
							\`
							script.appendChild(document.createTextNode(code))
							document.querySelector("head").appendChild(script)
						} else {
							window.postMessage(document.URL, "*") //Just use URL otherwise
						}
					`
				}, () => {
					if(chrome.runtime.lastError) {
						chrome.runtime.onMessage.removeListener(retrieveURL)
						resolve(url)
					}
				})
			})
		} else {
			return new Promise((resolve, reject) => resolve(url))
		}
	}
}