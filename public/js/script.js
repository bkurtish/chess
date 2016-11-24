Element.prototype.hasClassName = function(name) {
    return new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)").test(this.className);
};

Element.prototype.addClassName = function(name) {
    if (!this.hasClassName(name)) {
        this.className = this.className ? [this.className, name].join(' ') : name;
    }
};

Element.prototype.removeClassName = function(name) {
    if (this.hasClassName(name)) {
        var c = this.className;
        this.className = c.replace(new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)", "g"), "");
    }
};

var challengeButton = document.getElementById("challengePlayer");
document.querySelector("#incoming-challenge-popup .popup-yes").onclick = function(){
	sendAcceptChallenge();
	document.getElementById("incoming-challenge-popup").addClassName("disabled");
}

document.querySelector("#incoming-challenge-popup .popup-no").onclick = function(){
	sendRefuseChallenge();
	document.getElementById("incoming-challenge-popup").addClassName("disabled");
}


function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

var connectedUsers = [];
var moves = [];
var originSquare = null;
var clickedUser = null;
function onClickUser(el) {
	id = el.target.attributes["user-id"].value;
	element = el.target;
	if(!element.hasClassName("myself")) {
		elements = document.querySelectorAll("#players li").forEach(function(el){
			el.classList.remove("clicked");
		});
		element.addClassName("clicked");
		clickedUser = id;
		challengeButton.removeAttribute("disabled");	
	}
	
}
function addUserToList(user) {
	var myself = false;
	if(user.username === readCookie("username")) {
		myself = true;
	}
	if(typeof connectedUsers[user.id] === "undefined") {
		listElement = document.createElement("li");
		listElement.textContent = user.username;
		listElement.setAttribute("user-id",user.id);
		listElement.onclick = onClickUser;
		if(myself) {
			listElement.setAttribute("class","myself");
		}
		connectedUsers[user.id] = user;
		document.querySelector("#players").appendChild(listElement);
	}
}
var ws = new WebSocket("ws://localhost:80");
ws.onopen = function(msg) {
	var message = {
		command:"connect",
		username:readCookie("username"),
		id:readCookie("id")
	}
	ws.send(JSON.stringify(message));
};
ws.onmessage = function(msg) {
	var message = JSON.parse(msg.data);
	switch(message.command) {
		case "welcome":
			console.log("Welcome to the dashboard, "+message.username);
			break;
		case "userConnected":
			console.log("User "+message.username+" connected to the dashboard");
			addUserToList(message);
			break;
		case "userDisconnected": 
			console.log("User "+message.id+" disconnected");
			var target = document.querySelector('#players li[user-id="'+message.id+'"]');
			target.remove();
			delete connectedUsers[message.id];
			break;
		case "listOfUsers":
			var users = message.users;
			for(var i in users) {
				addUserToList(users[i]);
			}
			break;
		case "incomingChallenge":
			var challenger = message.challenger;
			var popup = document.getElementById("incoming-challenge-popup");
			var popupChallenger = document.getElementById("popup-challenger").textContent = challenger;
			popup.removeClassName("disabled");
			break;
		case "invalidState":
			console.log(message.details);
			break;
		case "challengeSentSuccessfully": {
			console.log(message.command);
			break;
		}
		case "challengeCancelled": {
			document.querySelectorAll(".dashboard-popup").forEach(function(el) {
				el.addClassName("disabled");
			});
			var popup = document.getElementById("info-popup");
			popup.removeClassName("disabled");
			document.querySelector("#info-popup .popup-text").textContent = "Challenge has been cancelled";
			document.querySelector("#info-popup .popup-action").onclick = function(){
				popup.addClassName("disabled");
			};
			break;
		}
		case "challengeRefused": {
			document.querySelectorAll(".dashboard-popup").forEach(function(el) {
				el.addClassName("disabled");
			});
			var popup = document.getElementById("info-popup");
			popup.removeClassName("disabled");
			document.querySelector("#info-popup .popup-text").textContent = "Challenge has been refused";
			document.querySelector("#info-popup .popup-action").onclick = function(){
				popup.addClassName("disabled");
			};
			break;
		}
		case "challengeAccepted": {
			document.querySelectorAll(".dashboard-popup").forEach(function(el) {
				el.addClassName("disabled");
			});
			console.log(message);
			startGame(message.isWhite,message.playerUsername,message.opponentUsername);
			break;
		}
		case "gameResult": {
			console.log("A game has just ended! "+message.winner+" defeated "+message.loser);
			break;
		}
		case "validMoves": {
			moves = message.moves;
			originSquare = message.origin;
			document.querySelectorAll(".gameboard-square.origin-square").forEach(function(el){el.removeClassName("origin-square");});
			if(moves.length != 0) {
				document.querySelector(".gameboard-play-area div[data-coord='"+message.origin+"']").addClassName("origin-square");
			}
			document.querySelectorAll(".gameboard-square.valid-square").forEach(function(el){el.removeClassName("valid-square");});
			for(var i in moves) {
				document.querySelector(".gameboard-play-area div[data-coord='"+moves[i]+"']").addClassName("valid-square");
			}
			break;
		}
		case "pieceMoved": {
			document.querySelectorAll(".gameboard-square.origin-square").forEach(function(el){el.removeClassName("origin-square");});
			document.querySelectorAll(".gameboard-square.valid-square").forEach(function(el){el.removeClassName("valid-square");});
			var src = message.src;
			var target = message.target;
			var piece = document.querySelector(".gameboard-material[data-piece-coord='"+src+"']");
			var targetSquare = document.querySelector(".gameboard-square[data-coord='"+target+"']");
			var targetPiece = document.querySelector(".gameboard-material[data-piece-coord='"+target+"']");
			if(targetPiece !== null) {
				targetPiece.remove();
			}
			piece.style.top = targetSquare.offsetTop+"px";
			piece.style.left = targetSquare.offsetLeft+"px";
			piece.setAttribute("data-piece-coord",target);
			var isCastling = message.isCastling;
			if(typeof isCastling === "undefined") {
				flipTurnIndicator();
			}
			break;
		}
		case "pieceCaptured": {
			var captured = message.captured;
			var targetPiece = document.querySelector(".gameboard-material[data-piece-coord='"+captured+"']");
			targetPiece.remove();
			break;
		}
		case "pieceCanBePromoted": {
			displayPromotionPopup(message.src,message.target);
			break;
		}
		case "piecePromoted": {
			document.querySelectorAll(".gameboard-square.origin-square").forEach(function(el){el.removeClassName("origin-square");});
			document.querySelectorAll(".gameboard-square.valid-square").forEach(function(el){el.removeClassName("valid-square");});
			var targetSquare = document.querySelector(".gameboard-square[data-coord='"+message.targetSquare+"']");
			var piece = document.querySelector(".gameboard-play-area .gameboard-material[data-piece-coord='"+message.srcSquare+"']");
			var targetPiece = document.querySelector(".gameboard-material[data-piece-coord='"+message.targetSquare+"']");
			if(targetPiece !== null) {
				targetPiece.remove();
			}
			piece.style.top = targetSquare.offsetTop+"px";
			piece.style.left = targetSquare.offsetLeft+"px";
			piece.setAttribute("data-piece-coord",message.targetSquare);
			var pieceImage = message.color + message.targetPiece;
			piece.removeClassName("gameboard-wp");
			piece.removeClassName("gameboard-bp");
			piece.addClassName("gameboard-"+pieceImage);
			flipTurnIndicator();
			break;
		}
		case "gameWon": {
			displayVictoryNotification();
			break;
		}
		case "gameLost": {
			displayLossNotification();
			break;	
		}
		case "moveHistory": {
			drawHistory(message.history);
			break;
		}
	}
};

function drawHistory(history) {
	var container = document.querySelector(".gameboard-moves-container");
	while(container.firstChild) {
		container.removeChild(container.firstChild);
	}

	for(var i=0;i<history.length;i+=2) {
		var row = document.createElement("div");
		row.addClassName("gameboard-moves-element");
		var number = document.createElement("div");
		number.textContent = (i/2)+1;
		number.addClassName("moves-element-turn");
		row.appendChild(number);
		var whiteTurn = document.createElement("div");
		whiteTurn.addClassName("moves-element-white");
		whiteTurn.textContent = history[i];
		row.appendChild(whiteTurn);
		var blackTurn = document.createElement("div");
		blackTurn.addClassName("moves-element-black");
		if(typeof history[i+1] !== "undefined") {
			blackTurn.textContent = history[i+1];
		}
		row.appendChild(blackTurn);
		container.appendChild(row);
	}
}

function flipTurnIndicator() {
	var indicator = document.querySelector(".gameboard-players .turn-indicator");
	if(indicator.getAttribute("data-turn") === "yours") {
		indicator.setAttribute("data-turn","notYours");
		indicator.textContent = "It is your opponent's turn";
	}
	else {
		indicator.setAttribute("data-turn","yours");
		indicator.textContent = "It is your turn";	
	}
}

function displayLossNotification() {
	displayNotification("You lost the game");
}

function displayVictoryNotification() {
	displayNotification("You are the winner");
}

function displayNotification(text) {
	var container = document.querySelector(".gameboard-play-area");
	var overlay = document.createElement("div");
	overlay.addClassName("gameboard-overlay");
	container.appendChild(overlay);
	var notificationBar = document.createElement("div");
	notificationBar.addClassName("gameboard-notification");
	notificationBar.textContent = text;
	container.appendChild(notificationBar);
	var btn = document.createElement("button");
	notificationBar.appendChild(btn);
	btn.textContent = "OK";
	btn.onclick = function(ev) {
		ev.stopPropagation();
		clearBoard();
	}
}

function displayPromotionPopup(src,target) {
	var container = document.querySelector(".gameboard-play-area");
	var overlay = document.createElement("div");
	overlay.addClassName("gameboard-overlay");
	container.appendChild(overlay);
	var selector = document.createElement("div");
	selector.addClassName("gameboard-promotion-popup");
	var queen = document.createElement("img");
	queen.setAttribute("src","/public/img/wq.png");
	var rook = document.createElement("img");
	rook.setAttribute("src","/public/img/wr.png");
	var bishop = document.createElement("img");
	bishop.setAttribute("src","/public/img/wb.png");
	var knight = document.createElement("img");
	knight.setAttribute("src","/public/img/wn.png");
	queen.onclick = function(){
		sendGameMove(src,target,"q");
		overlay.remove();
		selector.remove();
	}
	rook.onclick = function(){
		sendGameMove(src,target,"r");
		overlay.remove();
		selector.remove();
	}
	bishop.onclick = function(){
		sendGameMove(src,target,"b");
		overlay.remove();
		selector.remove();
	}
	knight.onclick = function(){
		sendGameMove(src,target,"n");
		overlay.remove();
		selector.remove();
	}
	selector.appendChild(queen);
	selector.appendChild(rook);
	selector.appendChild(bishop);
	selector.appendChild(knight);
	var cancelButton = document.createElement("button");
	cancelButton.textContent = "Cancel";
	cancelButton.onclick = function() {
		overlay.remove();
		selector.remove();
	};
	selector.appendChild(cancelButton);
	container.appendChild(selector);
}

function sendCancelOutstandingChallenge() {
	var message = {
		command: "cancelOutstandingChallenge"
	}
	ws.send(JSON.stringify(message));
}

function sendRefuseChallenge() {
	var message = {
		command: "refuseChallenge"
	}
	ws.send(JSON.stringify(message));
}

function sendAcceptChallenge() {
	var message = {
		command: "acceptChallenge"
	}
	ws.send(JSON.stringify(message));
}

function sendResignGameMessage() {
	var message = {
		command: "resignGame"
	}
	ws.send(JSON.stringify(message));
}

function sendGameMove(src,target,promotion) {
	var message = {
		command:"gameMove",
		src:src,
		target:target
	}
	if(typeof promotion !== "undefined") {
		message.promotion = promotion;
	}
	ws.send(JSON.stringify(message));
}

function sendQueryValidMoves(src) {
	var message = {
		command: "queryValidMoves",
		square: src
	}
	ws.send(JSON.stringify(message));
}
challengeButton.onclick = function(){
	var message = {
		command:"challengeUser",
		username:readCookie("username"),
		target:clickedUser
	}
	var popup = document.getElementById("outstanding-challenge-popup"); 
	popup.removeClassName("disabled");
	document.querySelector("#outstanding-challenge-popup #popup-target").textContent = connectedUsers[clickedUser].username;
	document.querySelector("#outstanding-challenge-popup .popup-action").onclick = function(){
		sendCancelOutstandingChallenge();
		popup.addClassName("disabled");
	};
	ws.send(JSON.stringify(message));
};

function drawPiece(type,rowPosition,colPosition,coord,parent) {
	var piece = document.createElement("div");
	piece.addClassName("gameboard-material");
	piece.addClassName("gameboard-"+type);
	piece.setAttribute("data-piece-coord",coord);
	piece.style.top = rowPosition + "px";
	piece.style.left = colPosition + "px";
	parent.appendChild(piece);
}

function drawSquare(coord,color,parent) {
	var square = document.createElement("div");
	square.addClassName("gameboard-square");
	square.addClassName("gameboard-square-"+color);
	square.setAttribute("data-coord",coord);
	parent.appendChild(square);
}

function clearBoard() {
	var playArea = document.querySelector(".gameboard");
	playArea.addClassName("disabled");
	var container = document.querySelector(".gameboard-play-area");
	while (container.firstChild) {
	    container.removeChild(container.firstChild);
	}
	var opponentName = document.querySelector(".gameboard-players .opponent");
	opponentName.removeClassName("black-player");
	opponentName.removeClassName("white-player");
	var playerName = document.querySelector(".gameboard-players .player");
	playerName.removeClassName("black-player");
	playerName.removeClassName("white-player");

}

function startGame(isWhite,playerUsername,opponentUsername) {

	var resignButton = document.querySelector(".gameboard-resign-button");
	resignButton.onclick = function() {
		sendResignGameMessage();
		clearBoard();
	}

	var opponentName = document.querySelector(".gameboard-players .opponent");
	opponentName.textContent = opponentUsername;
	var playerName = document.querySelector(".gameboard-players .player");
	playerName.textContent = playerUsername;
	var turnIndicator = document.querySelector(".gameboard-players .turn-indicator");
	if(isWhite) {
		turnIndicator.textContent = "It is your turn";
		turnIndicator.setAttribute("data-turn","yours");
		opponentName.addClassName("black-player");
		playerName.addClassName("white-player");
	}
	else {
		turnIndicator.textContent = "It is your opponent's turn";
		turnIndicator.setAttribute("data-turn","notYours");
		opponentName.addClassName("white-player");
		playerName.addClassName("black-player");
	}


	var whitePawnRow = isWhite?420:70;
	var whitePieceRow = isWhite?490:0;
	var blackPawnRow = isWhite?70:420;
	var blackPieceRow = isWhite?0:490;
	var lookup = ["a","b","c","d","e","f","g","h"];
	var gameboard = document.querySelector(".gameboard-play-area");

	while (gameboard.firstChild) {
	    gameboard.removeChild(gameboard.firstChild);
	}

	document.querySelector(".gameboard").removeClassName("disabled");

	//white pawns
	for(var i=0;i<8;i++) {
		var j = i;
		if(!isWhite) {
			j = 7-i;
		}
		drawPiece("wp",whitePawnRow,70*i,lookup[j]+"2",gameboard);
	}
	//black pawns
	for(var i=0;i<8;i++) {
		var j = i;
		if(!isWhite) {
			j = 7-i;
		}
		drawPiece("bp",blackPawnRow,70*i,lookup[j]+"7",gameboard);
	}

	var isWhiteOffset = 0;
	if(!isWhite) {
		isWhiteOffset = 490;
	}
	//white rooks
	drawPiece("wr",whitePieceRow,Math.abs(isWhiteOffset-0)+"","a1",gameboard);
	drawPiece("wr",whitePieceRow,Math.abs(isWhiteOffset-490)+"","h1",gameboard);

	//black rooks
	drawPiece("br",blackPieceRow,Math.abs(isWhiteOffset-0)+"","a8",gameboard);
	drawPiece("br",blackPieceRow,Math.abs(isWhiteOffset-490)+"","h8",gameboard);

	//white knights
	drawPiece("wn",whitePieceRow,Math.abs(isWhiteOffset-70)+"","b1",gameboard);
	drawPiece("wn",whitePieceRow,Math.abs(isWhiteOffset-420)+"","g1",gameboard);

	//black knights
	drawPiece("bn",blackPieceRow,Math.abs(isWhiteOffset-70)+"","b8",gameboard);
	drawPiece("bn",blackPieceRow,Math.abs(isWhiteOffset-420)+"","g8",gameboard);

	//white bishops
	drawPiece("wb",whitePieceRow,Math.abs(isWhiteOffset-140)+"","c1",gameboard);
	drawPiece("wb",whitePieceRow,Math.abs(isWhiteOffset-350)+"","f1",gameboard);

	//black bishops
	drawPiece("bb",blackPieceRow,Math.abs(isWhiteOffset-140)+"","c8",gameboard);
	drawPiece("bb",blackPieceRow,Math.abs(isWhiteOffset-350)+"","f8",gameboard);

	//white queen
	drawPiece("wq",whitePieceRow,Math.abs(isWhiteOffset-210)+"","d1",gameboard);

	//white king
	drawPiece("wk",whitePieceRow,Math.abs(isWhiteOffset-280)+"","e1",gameboard);

	//black king
	drawPiece("bk",blackPieceRow,Math.abs(isWhiteOffset-280)+"","e8",gameboard);

	//black queen
	drawPiece("bq",blackPieceRow,Math.abs(isWhiteOffset-210)+"","d8",gameboard);

	var color = "white";
	for(var i = 1;i<=8;i++) {
		for(var j = 0;j<8;j++) {
			var column = isWhite?9-i:i;
			var row = isWhite?lookup[j]:lookup[7-j];
			var coord = row+column;
			drawSquare(coord,color,gameboard);
			if(color=="white") {
				color = "black";
			}
			else {
				color = "white";
			}
		}
		if(color=="white") {
			color = "black";
		}
		else {
			color = "white";
		}
	}

	var whiteTurn = true;
	var clicked = false;
	var clickedX;
	var clickedY;
	gameboard.onclick = function(ev) {
		var rect = gameboard.getBoundingClientRect();
	    var x = Math.floor((ev.clientX - rect.left)/70);
	    x = isWhite?x:7-x;
	    var y = 0;
	    if(isWhite) {
	    	y = 8-Math.floor((ev.clientY - rect.top)/70);
	    }
	    else {
	    	y = Math.floor((ev.clientY - rect.top)/70) + 1;
	    }
	    
	    var clickedCoord = lookup[x]+y;
	    if(moves.includes(clickedCoord)) {
	    	sendGameMove(originSquare,clickedCoord);
	    	originSquare = null;
	    	moves = [];
	    }
	    else {
	    	sendQueryValidMoves(clickedCoord);	
	    }
	}
}