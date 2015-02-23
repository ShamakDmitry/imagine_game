/*Object.prototype.extend = function (obj) {
	for (var i in obj)
		this[i] = obj[i];
};*/

var round_stages = {
	leader: ["write&select", "wait", "watch", "end"],
	minor: ["wait", "select", "guess", "end"]
};

var stagesCallback = {
	"write&select": [],
	"select": [],
	"guess": [],
	"wait": []
};

try {
	var exports = module.exports = {};

	var game = exports;

	game.f = Game;
} catch (e) {
	if (console) {
		console.log(e);
	}
}

function Game(attrs) {
	this.group = attrs.group;
	this.cards = attrs.cards;
	this.status = attrs.status;

	this.minPlayers = attrs.minPlayers;

	this.maxRound = attrs.maxRound;
	this.maxScore = attrs.maxScore;

	this.selectedCards = (attrs.selectedCards) ? attrs.selectedCards : [];
	this.guessedCards = (attrs.guessedCards) ? attrs.guessedCards : [];

	this.round = attrs.round;
	this.word = (attrs.word) ? attrs.word : "???";

	this.leader = attrs.leader;

	this.scoresWasAdded = false;

	this.addSelectedCard = function (card, userId) {
		var r = this.getRandom(this.group.length);

		while (this.selectedCards[r] != undefined) {
			r = this.getRandom(this.group.length);
		}

		this.selectedCards[r] = {
			card: card,
			userId: userId
		};
	};

	this.getRandom = function (max) {
		var r = Math.floor(Math.random() * max);

		return r;
	};

	this.addGuessedCard = function (card, userId) {
		this.guessedCards.push({
			card: card,
			userId: userId
		});
	};

	this.isAllReady = function () {
		var res = true;
		for (var i = 0; i < this.group.length; i++) {
			if (!(this.group[i]).ready)
				res = false;
		}

		return res;
	};

	this.getCards = function () {
		var arr = [];
		for (var i = 0; i < 4; i++) {
			if (this.cards.length > i) arr.push(this.cards[i]);
		}

		this.cards = this.cards.slice(4);

		return arr;
	};

	this.getUserInd = function (id) {
		var ind = 0;

		for (var i = 0; i < this.group.length; i++) {
			if (this.group[i].id == id) {
				ind = i;

				break;
			}
		}

		return ind;
	};

	this.getUserIndByName = function (name) {
		var ind = 0;

		for (var i = 0; i < this.group.length; i++) {
			if (this.group[i].name == name) {
				ind = i;

				break;
			}
		}

		console.log("find by ", name, "next", ind);
		return ind;
	};

	this.removeUser = function (type, val) {
	    this.stopGame();
		//this.group.splice(((type == "byId") ? this.getUserInd(val) : this.getUserIndByName(val)), 1);

		if (this.minPlayers && this.group.length < this.minPlayers) {
			this.stopGame();
		}
	};

	this.setUserAction = function (attrs) {
		if (attrs.word) this.word = attrs.word;
		if (attrs.selectedCard) this.addSelectedCard(attrs.selectedCard, attrs.id);
		if (attrs.guessedCard) this.addGuessedCard(attrs.guessedCard, attrs.id);
		if (this.group[this.getUserInd(attrs.id)]) {
			this.group[this.getUserInd(attrs.id)].ready = attrs.ready;
			this.group[this.getUserInd(attrs.id)].status = attrs.status;
		}

		if (this.isAllReady()) {
			this.endStage();
		}
	};

	this.endStage = function () {
		this.round.stageNum++;

		for (var i = 0; i < this.group.length; i++) {
			this.group[i].ready = false;
		}

		if (this.round.stageNum >= this.round.stageLength) {
			this.endRound();
		}
	};

	this.getUserSelectedCard = function (id, card) {
		var user;
		for (var i = 0; i < this.selectedCards.length; i++) {
			if (typeof id == "number") {
				if (this.selectedCards[i].userId == id) {
					user = this.selectedCards[i];
					break;
				}
			} else if (card) {
				if (this.selectedCards[i].card == card) {
					user = this.selectedCards[i];
					break;
				}
			}
		}

		//if (!user) console.log(user, id, card);
		return user;
	};

	this.addPoint = function (id, factor) {
		var point = 10;
		factor = (factor) ? factor : 1;

		this.group[this.getUserInd(id)].score += point * factor;
	};

	this.mathScores = function () {
		if (this.guessedCards.length && !this.scoresWasAdded) {
		    //console.log(this.guessedCards);

		    var leaderCard = (this.getUserSelectedCard(this.leader)).card;

		    for (var i = 0; i < this.guessedCards.length; i++) {
		        if (this.guessedCards[i].card == leaderCard) {
		            this.addPoint(this.leader, 2);
		            this.addPoint(this.guessedCards[i].userId);
		        } else {
		            this.addPoint((this.getUserSelectedCard(false, this.guessedCards[i].card)).userId);
		        }
		    }

		    this.scoresWasAdded = true;
		}
	};

	this.startRound = function () {
		this.selectedCards = [];
		this.guessedCards = [];
		this.word = "???";
		this.round.num++;

		this.scoresWasAdded = false;

		this.leader++;
		if (this.leader >= this.group.length) {
			this.leader = 0;
		}

		this.round.stageNum = 0;
	};

	this.canContinueGame = function () {
		var res = false;
		var cardsNeeded = this.group.length * 4;

		if (cardsNeeded <= this.cards.length) {
			res = true;
		}

		if (this.maxRound && this.maxRound >= this.round.num) {
		    res = false;
		}

		if (this.maxScore) {
		    for (var i = 0; i < this.group.length; i++) {
		        if (this.group[i].score >= this.maxScore) {
                    res = false;
                    break;
		        }
		    }
		}

		if (!res) console.log("STOP GAME", this.maxRound, this.maxScore);

		return res;
	};

	this.stopGame = function () {
		this.status = "finished";
	};

	this.endRound = function () {
		if (this.canContinueGame()) {
			this.startRound();
		} else this.stopGame();
	};
};

function Player(attrs) {
	this.id = attrs.id;
	this.name = attrs.name;

	this.card = attrs.card;
	this.word = attrs.word;

	this.status = attrs.status;

	this.score = (attrs.score) ? attrs.score : 0;
};

function Round(attrs) {
	this.num = attrs.num;
	this.stageNum = attrs.stageNum;

	this.stageLength = 4;
};

function User(attrs) {
	this.id = attrs.id;

	this.status = (attrs.status) ? attrs.status : "minor";

	this.word = attrs.word;
	this.cards = attrs.cards;
};