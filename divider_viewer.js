window.onmessage = msg => {
	//Try/catch in case extension context is invalidated
	try {
		//Only allow this extension to post messages
		if(msg.origin === ("chrome-extension://" + chrome.runtime.id)) {
			switch(msg.data) {
				case "back":
					window.history.back()
					break
				case "forward":
					window.history.forward()
					break
				case "reload":
					window.location.reload()
					break
			}
		}
	} catch(e) {}
}