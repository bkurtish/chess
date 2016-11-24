var express = require("express");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var uuid = require("node-uuid");
var path = require("path");
var Chess = require("chess.js").Chess;
var pgpool = require("./db.js");

var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;

passport.use(new Strategy({
	clientID: "258331814570076",
	clientSecret: "cb58f7e0cddc73bf99df390a6770c051",
	callbackURL: 'http://chess.devtest:3000/login/facebook/return'
},
function(accessToken, refreshToken, profile, cb) {
	return cb(null, profile);
}));

passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});

var app = express();

var expressWs = require('express-ws')(app);
var openChannels = [];

var htmlPath = __dirname + "/html";

app.use("/public",express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function (req, res) {
	res.sendFile("index.html",{root:htmlPath});
});

app.post('/setcookie', (req,res) => {
	var username = req.body.username;
	if(typeof username == "undefined" || username == "") {
		res.redirect("/");		
	}
	else {
		res.cookie("username",username);
		res.redirect("/dashboard")	
	}
});

app.get('/dashboard', require('connect-ensure-login').ensureLoggedIn("/"),
	(req,res) => {
	res.cookie("username",req.user.displayName);
	res.cookie("id",req.user.id);
	res.sendFile("dashboard.html",{root:htmlPath});
});

app.get('/login/facebook',
  passport.authenticate('facebook'));

app.get('/login/facebook/return', 
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
  	pgpool.query("SELECT * FROM users where id=$1",[req.user.id]).then(function(data) {
  		if(data.rows.length===0) {
  			pgpool.query("INSERT INTO users (id) VALUES ($1)",[req.user.id]).then(function(data) {
  				console.log("User registered successfully with id "+req.user.id);
  			});
  		}
  	})
    res.redirect('/dashboard');
  });

app.get('/profile',
require('connect-ensure-login').ensureLoggedIn("/"),
function(req, res){
    res.send(req.user);
});

app.get("/logout",function(req,res) {
	req.logout();
	res.redirect("/");
});

app.get("/test",function(req,res) {
	res.sendFile("test.html",{root:htmlPath});
})

app.ws("/",function(ws) {

	var username;
	var id = uuid.v1();
	openChannels[id] = {
		ws:ws,
		userData: {
			id: id,
			username: "",
			state: "idle"
		}
	};

	function broadcast(message) {
		for(var i in openChannels) {
			var id = openChannels[i].userData.id;
			sendToUser(message,id);
		}
	}

	function sendToUser(message,id) {
		try {
			openChannels[id].ws.send(JSON.stringify(message));	
		}
		catch (e) {
			console.log(e);
		}
		
	}

	function connectionMessage(id,username) {
		var message = {
			command:"userConnected",
			id:id,
			username:username
		}
		return message;
	}

	function welcomeMessage(username) {
		var message = {
			command:"welcome",
			username:username
		}
		return message;
	}

	function listOfUsersMessage() {
		var users = [];
		for(var i in openChannels) {
			users.push(openChannels[i].userData);
		}
		var message = {
			command:"listOfUsers",
			users:users
		}
		return message;
	}

	function disconnectionMessage(id) {
		var message = {
			command:"userDisconnected",
			id:id
		}
		return message;
	}

	function incomingChallengeMessage(challengerName) {
		var message = {
			command:"incomingChallenge",
			challenger:challengerName
		}
		return message;
	}

	function invalidStateMessage(detailedMessage) {
		var message = {
			command: "invalidState",
			details:detailedMessage
		}
		return message;
	}

	function challengeSentMessage() {
		var message = {
			command: "challengeSentSuccessfully"
		}
		return message;
	}

	function challengeCancelledMessage() {
		var message = {
			command: "challengeCancelled"
		}
		return message;
	}

	function challengeRefusedMessage() {
		var message = {
			command: "challengeRefused"
		}
		return message;
	}

	function challengeAcceptedMessage(isWhite,playerUsername,opponentUsername) {
		var message = {
			command: "challengeAccepted",
			isWhite: isWhite,
			playerUsername:playerUsername,
			opponentUsername:opponentUsername
		}
		return message;
	}

	function gameStartedMessage(firstPlayerId,secondPlayerId) {
		var message = {
			command: "gameStarted",
			firstPlayer: firstPlayerId,
			secondPlayer: secondPlayerId
		}
		return message;
	}

	function gameLostMessage() {
		var message = {
			command: "gameLost"
		}
		return message;
	}

	function gameWonMessage() {
		var message = {
			command: "gameWon"
		}
		return message;
	}

	function gameResultMessage(winner,loser) {
		var message = {
			command: "gameResult",
			winner: winner,
			loser: loser
		}
		return message;
	}

	function validMovesMessage(square,moves) {
		var message = {
			command: "validMoves",
			moves: moves,
			origin: square
		}
		return message;
	}

	function pieceMovedMessage(src,target,isCastling) {
		var message = {
			command: "pieceMoved",
			src:src,
			target:target
		}
		if(typeof isCastling !== "undefined") {
			message.isCastling = isCastling;
		}
		return message;
	}

	function pieceCapturedMessage(captured) {
		var message = {
			command: "pieceCaptured",
			captured: captured
		}
		return message;
	}

	function piecePromotionPromptMessage(src,target) {
		var message = {
			command: "pieceCanBePromoted",
			src:src,
			target:target
		}
		return message;
	}

	function piecePromotedMessage(srcSquare,targetSquare,targetPiece,color) {
		var message = {
			command: "piecePromoted",
			srcSquare:srcSquare,
			targetSquare: targetSquare,
			targetPiece: targetPiece,
			color: color
		}
		return message;
	}

	function moveHistoryMessage(history) {
		var message =  {
			command: "moveHistory",
			history:history
		}
		return message;
	}

	ws.on("message",function(msg){
		var message = JSON.parse(msg);
		var command = message.command;
		var username = message.username;
		var fbId = message.id;
		switch(command) {
			case "connect":
				openChannels[id].userData.username = username;
				openChannels[id].userData.fbId = fbId;
				broadcast(connectionMessage(id,username));
				sendToUser(listOfUsersMessage(),id);
				break;
			case "challengeUser":
				var target = message.target;
				var targetUsername = message.username; 
				if(id === target) {
					sendToUser(invalidStateMessage("Cannot challenge yourself"),id);
				}
				else if(openChannels[id].userData.state=="idle" && openChannels[target].userData.state=="idle") {
					challengeUser(id,target,targetUsername);
				}
				else {
					var detailedMessage = "";
					if(openChannels[id].userData.state != "idle") {
						detailedMessage = "Cannot challenge anyone while you are not in idle state";
					}
					else {
						detailedMessage = "Target cannot accept challenges at the moment";
					}
					sendToUser(invalidStateMessage(detailedMessage),id);
				}
				break;
			case "cancelOutstandingChallenge":
				if(openChannels[id].userData.state === "outstandingChallenge") {
					var target = openChannels[id].userData.currentChallengeReceiever;
					cancelChallenge(id,target);
				}
				else {
					sendToUser(invalidStateMessage("Can only cancel challenge while it is outstanding"),id);
				}
				break;
			case "refuseChallenge":
				if(openChannels[id].userData.state === "incomingChallenge") {
					var challengerId = openChannels[id].userData.currentChallenger;
					refuseChallenge(id,challengerId);
				}
				else {
					sendToUser(invalidStateMessage("Can only refuse challenge while one is incoming"),id);
				}
				break;
			case "acceptChallenge":
				if(openChannels[id].userData.state === "incomingChallenge") {
					var challengerId = openChannels[id].userData.currentChallenger;
					acceptChallenge(id,challengerId);
				}
				else {
					sendToUser(invalidStateMessage("Can only accept challenge while one is incoming"),id);
				}
				break;
			case "resignGame":
				if(openChannels[id].userData.state === "game") {
					var opponentId = openChannels[id].userData.currentOpponent;
					resignGame(id,opponentId);
				}
				else {
					sendToUser(invalidStateMessage("Can only resign while in a game"),id);
				}
				break;
			case "gameMove":
				if(openChannels[id].userData.state === "game") {
					var board = openChannels[id].userData.game;
					var move = board.move({from:message.src,to:message.target,promotion:message.promotion});
					if(move !== null) {
						
						sendToUser(moveHistoryMessage(board.history()),id);
						sendToUser(moveHistoryMessage(board.history()),openChannels[id].userData.currentOpponent);

						//check for promotion
						if(move.flags.includes("p")) {
							sendToUser(piecePromotedMessage(move.from,move.to,move.promotion,move.color),id);
							sendToUser(piecePromotedMessage(move.from,move.to,move.promotion,move.color),openChannels[id].userData.currentOpponent);
						}

						//check for castling
						if(move.flags == "k" && move.color == "w") {
							sendToUser(pieceMovedMessage(move.from,move.to),id);
							sendToUser(pieceMovedMessage("h1","f1",true),id);
							sendToUser(pieceMovedMessage(move.from,move.to),openChannels[id].userData.currentOpponent);
							sendToUser(pieceMovedMessage("h1","f1",true),openChannels[id].userData.currentOpponent);
						}
						if(move.flags == "q" && move.color == "w") {
							sendToUser(pieceMovedMessage(move.from,move.to),id);
							sendToUser(pieceMovedMessage("a1","d1",true),id);
							sendToUser(pieceMovedMessage(move.from,move.to),openChannels[id].userData.currentOpponent);
							sendToUser(pieceMovedMessage("a1","d1",true),openChannels[id].userData.currentOpponent);
						}
						if(move.flags == "k" && move.color == "b") {
							sendToUser(pieceMovedMessage(move.from,move.to),id);
							sendToUser(pieceMovedMessage("h8","f8",true),id);
							sendToUser(pieceMovedMessage(move.from,move.to),openChannels[id].userData.currentOpponent);
							sendToUser(pieceMovedMessage("h8","f8",true),openChannels[id].userData.currentOpponent);
						}
						if(move.flags == "q" && move.color == "b") {
							sendToUser(pieceMovedMessage(move.from,move.to),id);
							sendToUser(pieceMovedMessage("a8","d8",true),id);
							sendToUser(pieceMovedMessage(move.from,move.to),openChannels[id].userData.currentOpponent);
							sendToUser(pieceMovedMessage("a8","d8",true),openChannels[id].userData.currentOpponent);
						}

						//check for en passant
						if(move.flags == "e") {
							var captured = move.to[0]+move.from[1];
							sendToUser(pieceMovedMessage(move.from,move.to),id);
							sendToUser(pieceMovedMessage(message.src,message.target),openChannels[id].userData.currentOpponent);
							sendToUser(pieceCapturedMessage(captured),id);
							sendToUser(pieceCapturedMessage(captured),openChannels[id].userData.currentOpponent);
						}

						if(move.flags == "n" || move.flags == "c" || move.flags == "b") {
							sendToUser(pieceMovedMessage(message.src,message.target),id);
							sendToUser(pieceMovedMessage(message.src,message.target),openChannels[id].userData.currentOpponent);
						}

						if(board.in_checkmate()) {
							resignGame(openChannels[id].userData.currentOpponent,id);
						}

						
					}
					else {
						//check for possibility of promotion
						var moves = board.moves({square:message.src,verbose: true}).filter(function(el){
							return el.from == message.src && el.to == message.target && el.flags.includes("p");
						});
						if(moves.length !== 0) {
							sendToUser(piecePromotionPromptMessage(message.src,message.target),id);
						}
					}
				}
				else {
					sendToUser(invalidStateMessage("Can only move while in a game"),id);
				}
				break;
			case "queryValidMoves":
				if(openChannels[id].userData.state === "game") {
					var board = openChannels[id].userData.game;
					var verboseMoves = board.moves({square:message.square,verbose: true});
					var filteredMoves = verboseMoves.filter(function(el){
						if(openChannels[id].userData.isWhite && el.color=="w") {
							return true;
						}
						else if(!openChannels[id].userData.isWhite && el.color=="b") {
							return true;
						}
						else {
							return false;
						}
					});
					var moves = filteredMoves.map(function(el){return el.to;});
					sendToUser(validMovesMessage(message.square,moves),id);
				}
				else {
					sendToUser(invalidStateMessage("Can only check moves while in a game"),id);
				}
			default: 
				break;
		}
	});

	ws.onclose = function(msg) {
		if(openChannels[id].userData.state === "outstandingChallenge") {
			var target = openChannels[id].userData.currentChallengeReceiever;
			cancelChallenge(id,target);
			
		}
		else if(openChannels[id].userData.state === "incomingChallenge") {
			var challengerId = openChannels[id].userData.currentChallenger;
			refuseChallenge(id,challengerId);
		}
		else if(openChannels[id].userData.state === "game") {
			var opponentId = openChannels[id].userData.currentOpponent;
			resignGame(id,opponentId);
		}
		delete openChannels[id];
		broadcast(disconnectionMessage(id));
	};

	function challengeUser(challengerId,challengeReceieverId,challengeReceiverUsername) {
		sendToUser(incomingChallengeMessage(challengeReceiverUsername),challengeReceieverId);
		sendToUser(challengeSentMessage(),challengerId);
		openChannels[challengerId].userData.state = "outstandingChallenge";
		openChannels[challengeReceieverId].userData.state = "incomingChallenge";
		openChannels[challengeReceieverId].userData.currentChallenger = challengerId;
		openChannels[challengerId].userData.currentChallengeReceiever = challengeReceieverId;
	}

	function cancelChallenge(challengerId,challengeReceieverId) {
		sendToUser(challengeCancelledMessage(),challengeReceieverId);
		openChannels[challengeReceieverId].userData.state = "idle";
		openChannels[challengerId].userData.state = "idle";
		delete openChannels[challengeReceieverId].userData.currentChallenger;
		delete openChannels[challengerId].userData.currentChallengeReceiever;

	}

	function refuseChallenge(challengeReceieverId, challengerId) {
		sendToUser(challengeRefusedMessage(),challengerId);
		openChannels[challengeReceieverId].userData.state = "idle";
		openChannels[challengerId].userData.state = "idle";
		delete openChannels[challengeReceieverId].userData.currentChallenger;
		delete openChannels[challengerId].userData.currentChallengeReceiever;
	}

	function acceptChallenge(challengeReceieverId, challengerId) {
		var isWhite = Math.random()>=0.5;
		sendToUser(challengeAcceptedMessage(isWhite,openChannels[challengeReceieverId].userData.username,openChannels[challengerId].userData.username),challengeReceieverId);
		sendToUser(challengeAcceptedMessage(!isWhite,openChannels[challengerId].userData.username,openChannels[challengeReceieverId].userData.username),challengerId);
		broadcast(gameStartedMessage(challengeReceieverId,challengerId));
		openChannels[challengeReceieverId].userData.state = "game";
		openChannels[challengerId].userData.state = "game";
		openChannels[challengeReceieverId].userData.currentOpponent = challengerId;
		openChannels[challengerId].userData.currentOpponent = challengeReceieverId;
		delete openChannels[challengeReceieverId].userData.currentChallenger;
		delete openChannels[challengerId].userData.currentChallengeReceiever;
		openChannels[challengeReceieverId].userData.game = openChannels[challengerId].userData.game = new Chess();
		openChannels[challengeReceieverId].userData.isWhite = isWhite;
		openChannels[challengerId].userData.isWhite = !isWhite;
	}

	function resignGame(resignerId,winnerId) {
		pgpool.query("insert into game_results (first_player,second_player,result,history) VALUES ($1,$2,$3,$4)",[
			openChannels[resignerId].userData.fbId,
			openChannels[winnerId].userData.fbId,
			-1,
			JSON.stringify(openChannels[winnerId].userData.game.history())
		]);
		sendToUser(gameLostMessage(),resignerId);
		sendToUser(gameWonMessage(),winnerId);
		broadcast(gameResultMessage(openChannels[winnerId].userData.username,openChannels[resignerId].userData.username));
		openChannels[winnerId].userData.state = "idle";
		openChannels[resignerId].userData.state = "idle";
		delete openChannels[winnerId].userData.currentOpponent;
		delete openChannels[resignerId].userData.currentOpponent;
		delete openChannels[winnerId].userData.iswhite;
		delete openChannels[resignerId].userData.isWhite;
		delete openChannels[winnerId].userData.game;
		delete openChannels[resignerId].userData.game;

	}

});

app.listen(80, function (ws) {
  console.log('Example app listening on port 80!');
});