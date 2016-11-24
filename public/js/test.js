var firstClient = new WebSocket("ws://localhost:3000");
var secondClient = new WebSocket("ws://localhost:3000");
firstClient.onopen = function(msg) {
	var message = {
		command:"connect",
		username:"firstTest",
		id:"1234"
	}
	firstClient.send(JSON.stringify(message));
};
secondClient.onopen = function(msg) {
	var message = {
		command:"connect",
		username:"secondTest",
		id:"4321"
	}
	secondClient.send(JSON.stringify(message));
};
function clientDraw(msg,target) {
	var message = JSON.parse(msg.data);
	var messageDiv = document.createElement("div");
	messageDiv.textContent = msg.data;
	messageDiv.setAttribute("class","message-element");
	target.appendChild(messageDiv);
}
firstClient.onmessage = function(msg) {
	clientDraw(msg,document.getElementById("first-col"));
}
secondClient.onmessage = function(msg) {
	clientDraw(msg,document.getElementById("second-col"));
}