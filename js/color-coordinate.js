import Tabs from "./classes/tabs.js"

//List of option keys and their correlating css property names
const bindings = [
	["primaryColor", "--color-primary"],
	["primaryVariantColor", "--color-primary-variant"],
	["accentColor", "--color-accent"],
	["accentVariantColor", "--color-accent-variant"],
	["backgroundColor", "--color-background"],
	["foregroundColor", "--color-foreground"],
	["foregroundVariantColor", "--color-foreground-variant"],
	["textColor", "--color-text"]
]

const style = document.documentElement.style

//Assigns css colors to those provided in options
for(let binding of bindings) {
	let [key, name] = binding
	Tabs.getOption(key).then(v => style.setProperty(name, v))
}