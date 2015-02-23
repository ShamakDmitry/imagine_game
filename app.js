var http = require("http"),
	url = require("url"),
    path = require("path"),
	fs = require('fs'),

	express = require('express');

var app = express();

var Game = require('./assets/js/game.js');

var server = http.createServer(app).listen(3000, function () {
    console.log("localhost:3000 Started");
});
//SOCKET IO
var io = require("socket.io").listen(server);

var players = [],
	playersCookie = [],
	game = false;

io.sockets.on('connection', function (socket) {

	socket.on('addPlayer', function (attrs) {
		var ind = players.indexOf(attrs.player);

		if(!(ind+1) && (!game || (game.status != "started"))) {
			players.push(attrs.player);
			playersCookie.push(attrs.cookie);
		} else if ((game && game.status == "started") || ((ind + 1) && playersCookie[ind] != attrs.cookie)) {
			io.emit('serverError', {
				text: "Game already started, please wait.",
				target: attrs.player
			});
		}

		io.emit('players', players);
	});

	socket.on('leaveGame', function (user) {
	    var ind = players.indexOf(user);

	    game.stopGame();

	    io.emit('serverCallback', game);

	    return false;

	    console.log("leave user", user);
		
		if (ind + 1) {
			game.removeUser("byName", user);

			players.splice(ind, 1);

			if (playersCookie[ind]) {
				playersCookie.splice(ind, 1);
			}
		}

		console.log('leaveGame', players);

		io.emit('players', players);

		io.emit('serverError', {
			text: "You leave game, click reconnect to log again",
			target: user
		});

		if (game.group.length < game.minPlayers) {
			console.log("no more players");

			if (game.status == "finished") {
				//game = false;
			}

			io.emit('serverCallback', game);
		}
	});

	socket.on('initGame', function (attrs) {
		var gameAttrs = {
			group: [],
			leader: 0,

			round: {
				num: 0,
				stageNum: 0,
				stageLength: 4
			},

			cards: [],

			status: "started"
		};

		for(var key in attrs) {
		    if (attrs[key]) gameAttrs[key] = attrs[key];
		}

		var cardsLength = 110;

		for (var i = 0; i < players.length; i++) {
		    gameAttrs.group.push({
				id: i,
				name: players[i],
				cards: false,
				word: false,
				status: "pending",
				ready: false,
				score: 0
			});
		}

		game = new Game.f(gameAttrs);
		

		for (var i = 0; i < cardsLength; i++) {
			var random = game.getRandom(cardsLength);
			while (gameAttrs.cards[random] != undefined) {
				random = game.getRandom(cardsLength);
			}
			gameAttrs.cards[random] = i;
		}

		io.emit('serverCallback', game);
	});

	socket.on('restartServer', function (attrs) {
		players = [];
		playersCookie = [];
		game = false;

		io.emit('restartClient', {});
	});


	socket.on('userQuite', function (attrs) {
		if (game) {
			game.removeUser("byId", attrs);

			io.emit('updateGroup', game.group);
		}
	});

	socket.on('mathScores', function (attrs) {
		if (game) {
			game.mathScores();
			io.emit('updateGroup', game.group);
		}
	});

	socket.on('userAction', function (attrs) {
	    if (attrs && attrs.ready) game.setUserAction(attrs);

		console.log("action", attrs);

		if (game.status == "finished") {
			//game = false;
		}

		if (game) {
			io.emit('serverCallback', game);
		}
	});

	socket.on('msg', function (msg) {
		io.emit('msg', msg);
	});

	socket.on('info', function (info) {
		io.emit('info', info);
	});
});

//SOCKET IO END ----------------

var requestCallback = function (res, data) {
	if (data) {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(data));
	}
	else {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end(err);
	}
};

app.use(express.static(__dirname + '/'));
app.use('/simple', express.static(__dirname + '/'));
app.use('/assets', express.static(__dirname + '/'));

app.get('/getCards/:user?/:num?', function (req, res) {
	var attrs = {
		num: req.params.num,
		user: req.params.user
	};

	console.log("User get cards", attrs.user);

	var data = game.getCards();

	requestCallback(res, data);
});

function setPage(req, res, page) {
	var filename = process.cwd() + page;
	fs.readFile(filename, "binary", function (err, file) {
		if (err) {
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.write(err + "\n");
			res.end();
			return;
		}

		res.writeHead(200);
		res.write(file, "binary");
		res.end();
	});
}