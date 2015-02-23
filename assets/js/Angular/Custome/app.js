var myApp;

var serverURL = "/";

if (!myApp) myApp = angular.module('App', ['ngRoute']);

if (myApp) {
	myApp.controller('Main', function ($scope, $http, $location) {
		$scope.cardUrl = "/assets/imgs/cards/";
		$scope.view = "/assets/view/table.html";

		$scope.debug = false;

		$scope.game = false;
		$scope.user = false;

		$scope.basicLang = "rus";
		$scope.lang = false;
		$scope.text = false;

		$scope.minPlayers = 0;

		$scope.lastSelected = false;

		$scope.config = {};

		$scope.pendingForCards = false;

		$scope.config.isAccessClosed = false;

		$scope.config.canWrite = false;
		$scope.config.canSelect = false;
		$scope.config.canGuess = false;
		$scope.config.showSelected = false;
		$scope.config.isStageEnd = false;
		$scope.config.canAction = false;
		$scope.config.showSelectedCardInfo = false;
		$scope.config.isNewStage = false;
		$scope.config.isNewRound = true;

		$scope.socket = io.connect(serverURL);

		$scope.socket.on('connect', function () {
			//console.log("socket connect");
		});

		$scope.socket.on('disconnect', function () {
		    //$scope.socket.emit('leaveGame', $scope.getUserName($scope.user.id));
		});

		$scope.socket.on('players', function (players) {
			console.log('players', players);

			$scope.playersList = players;
			$scope.update();
		});

		$scope.socket.on('serverError', function (error) {
			console.log("server error", error);
			if ($scope.user && $scope.getUserName($scope.user) == error.target) {
				$scope.config.isAccessClosed = true;
				$scope.config.error = error.text;
			} else {
				$scope.config.isAccessClosed = false;
			}

			$scope.update();
		});

		$scope.socket.on('restartClient', function (attrs) {
			window.location = "/";
		});

		$scope.socket.on('serverCallback', function (game) {
			if (game) {
				$scope.updateGame(game);
			} else {
				$scope.game = false;

				$scope.updateView();
			}

			$scope.update();
		});

		$scope.socket.on('updateGroup', function (group) {
			if (group && $scope.game) {
				$scope.game.group = group;
			}

			$scope.update();
		});

		$scope.restartServer = function () {
			$scope.socket.emit('restartServer', {});
		};

		$scope.isCommand = function (message) {
			var res = false;

			if (message && message.length && message[0] == "/") {
				res = message.slice(1, message.length);
			}

			return res;
		};

		$scope.toggleDebug = function () {
			$scope.debug = !$scope.debug;

			$scope.update();
		};

		$scope.toggleUserNav = function () {
			angular.element('nav .user').toggleClass('active');
		};

		$scope.getStageDescription = function () {
			var stage = $scope.getCurrentStage();

			var description = $scope.text.stageDescription[stage];

			return description;
		};

		$scope.getUserId = function () {
		    var id = $scope.user.id;

		    var ind = $scope.game.getUserInd(id);

		    console.log($scope.user, $scope.game.group);

		    return ind;
		}

		$scope.getShowTableCardAccess = function (item) {
		    var res = true;

		    if ($scope.user.status != 'leader') {
		        if (item.userId == $scope.getUserId()) {
		            res = false;
		        }

		        if ($scope.lastSelected && $scope.user.ready && item.card != $scope.lastSelected) {
		            res = false;
		        }
		    } 

		    return res;
		};

		$scope.isUserInList = function () {
			var res = false;

			if ($scope.playersList && $scope.playersList.length) {
				var ind = $scope.playersList.indexOf($scope.getUserName($scope.user));

				if (ind + 1) {
					res = true;

					$scope.config.isAccessClosed = false;

					$scope.update();
				}
			}

			return res;
		};

		$scope.onUserLeave = function () {
		    $scope.socket.emit('leaveGame', $scope.getUserName($scope.getUserId()));

			$scope.clearUserData();
			$scope.clearUserLocalData();
			$scope.game = false;
		};

		$scope.userNavAction = function (type) {
			//console.log(type);

			if (type == "logout") {
				localStorage.removeItem("User");
				$scope.user = false;
			} else if (type == "leave") {
				$scope.onUserLeave();
			} else if (type == "reconnect") {
				console.log("reconnect");

				$scope.isAccessClosed = false;
				$scope.checkLocalUser();
			}

			$scope.update();
		};

		$scope.canStartGame = function () {
			var res = false;

			if ($scope.playersList && $scope.getUserName($scope.user) == $scope.playersList[0] && $scope.playersList.length >= $scope.minPlayers) {
				res = true;
			}

			return res;
		};

		$scope.initText = function () {
			if (!$scope.lang) $scope.lang = $scope.basicLang;

			$scope.text = languages[$scope.lang];

			$scope.update();
		};

		$scope.startGame = function (attrs) {
		    $scope.clearUserLocalData();

		    if (attrs.minPlayers) $scope.minPlayers = attrs.minPlayers;

			$scope.socket.emit('initGame', attrs);


			$scope.update();
		};

		$scope.clearGameData = function () {
		    $scope.game.selectedCards = [];
		    $scope.game.guessedCards = [];

		    $scope.update();
		};

		$scope.getCards = function (attrs) {
			$http.get('/getCards/' + $scope.getUserName($scope.user) + '/' + attrs.num)
			  .success(function (data, status, headers, config) {
			  	if (attrs.callback) {
			  		attrs.callback(data);
			  	}
			  })
			  .error(function (data, status, headers, config) {
			  	if (attrs.errorCallback) {
			  		attrs.errorCallback(data);
			  	}
			  });
		};

		$scope.initUserCards = function (data) {
			if (typeof data == "object") {
				$scope.user.cards = data;

				$scope.saveUserLocalData();

				$scope.pendingForCards = false;
			}

			$scope.update();
		};

		$scope.checkUserCards = function () {
			if(!$scope.config.isAccessClosed && $scope.game && $scope.game.status == "started" && !$scope.pendingForCards) {
				var userCards = JSON.parse(localStorage.getItem('UserCards'));


				if (userCards) {
					$scope.user.cards = userCards;
				}

				if (!$scope.user.cards || !($scope.user.cards.length)) {
					$scope.pendingForCards = true;
					$scope.getCards({
						num: 4,
						callback: $scope.initUserCards
					});
				}
			}
			

			$scope.update();
		};

		$scope.updateGame = function (game) {
			if ($scope.game) {
				if ($scope.game.round.stageNum != game.round.stageNum) $scope.config.isNewStage = true;
				else $scope.config.isNewStage = false;

				if ($scope.game.round.num != game.round.num) $scope.config.isNewRound = true;
				else $scope.config.isNewRound = false;
			}

			if (!$scope.game) $scope.initGame(game);
			else $scope.game = new Game(game);

			$scope.checkUserCards();

			//console.log('updateGame');
			$scope.updateView();

			$scope.update();
		};

		$scope.logUser = function (userName) {
			console.log("logUser", userName);

			$scope.user = userName;
			$scope.socket.emit('addPlayer', {
				player: $scope.user,
				cookie: document.cookie
			});

			localStorage.setItem('User', JSON.stringify($scope.user));
			$scope.update();
		};

		$scope.getRandom = function (card) {
			var rand = Math.random() * 100;

			return rand;
		};

		$scope.initGame = function (game) {
			if(game) $scope.game = new Game(game);
			$scope.initUser();

			console.log("INIT GAME");

			$scope.clearStageData();

			$scope.update();
		};

		$scope.setUserAction = function () {
			console.log($scope.user);
			if ($scope.user) {
				//console.log("setUserAction");
				$scope.socket.emit('userAction', $scope.user);
			}

			$scope.update();
		};

		$scope.getCardImage = function (ind) {
			return { 'background-image': 'url(' + $scope.cardUrl + 'card' + ind + '.jpg)' };
		};

		$scope.isNotSelfCard = function (ind) {
			var res = false;

			for (var i = 0; i < $scope.game.selectedCards.length; i++) {
			    if ($scope.game.selectedCards[i].userId == $scope.getUserId() && $scope.game.selectedCards[i].card != ind) {
					res = true;
				}
			}

			return res;
		};

		$scope.showWarning = function (message) {
			alert(message);
		};

		$scope.selectCard = function (type, ind, elem) {
			var selector = ((type == "userCard") ? ".player-cards" : ".table-cards") + " .card";

			angular.element(selector + ".active").removeClass("active");

			elem.addClass("active");

			if (type == "userCard") {
			    $scope.user.selectedCard = ind;

			    $scope.lastSelected = ind;

				$scope.saveUserLocalData();
			} else if (type == "tableCard" && $scope.config.canGuess) {
				if ($scope.isNotSelfCard(ind)) {
				    $scope.user.guessedCard = ind;

				    $scope.lastSelected = ind;

					$scope.saveUserLocalData();
				} else {
					angular.element(selector + ".active").removeClass("active");
					$scope.showWarning("Свою карту выбирать нельзя!!!");
				}
			}

			$scope.update();
		};

		$scope.getUserName = function (attrs) {
			var res = "";

			if ($scope.game && $scope.game.group.length) {
				if (typeof attrs != "object") {
					if (typeof attrs == "number") res = $scope.game.group[attrs].name;
					else if (typeof attrs == "string") res = attrs;
				} else {
					res = $scope.game.group[attrs.id].name
				}
			} else if ($scope.user && typeof $scope.user != "object") {
				res = $scope.user;
			} else {
				res = $scope.getLocalUserData();
			}


			//console.log(attrs);
			return res;
		};

		$scope.endGame = function () {
			$scope.socket.emit('userQuite', $scope.user);

			$scope.update();
		};

		$scope.endRound = function (type) {
			if (type == "continue") {
				$scope.user.ready = true;
				$scope.setUserAction();

				$scope.clearUserLocalData();
			} else if (type == "end") {
				$scope.endGame();
			}

			$scope.update();
		};

		$scope.getCurrentStage = function () {
			var stage = ($scope.game && $scope.user.status) ? (round_stages[$scope.user.status][$scope.game.round.stageNum]) : false;

			return stage;
		};

		$scope.clearUserData = function () {
		    console.log("clear user data");

			$scope.user.selectedCard = false;
			$scope.user.guessedCard = false;
			$scope.user.word = false;
			$scope.user.cards = [];
			

			$scope.checkUserStatus();

			$scope.update();
		};

		$scope.clearStageData = function () {
			$scope.game.selectedCards = [];
			$scope.game.guessedCards = [];

			$scope.clearUserData();

			$scope.update();
		};

		$scope.hasPermission = function () {
			var res = false;

			var stage = $scope.getCurrentStage();

			if(!$scope.user.ready && ((stage == "select" && $scope.user.selectedCard) || (stage == "guess" && $scope.user.guessedCard) || (stage == "write&select" && $scope.user.selectedCard && $scope.user.word))) {
				res = true;
			}

			return res;
		};

		$scope.readyBtnCallback = function (word) {
			if ($scope.hasPermission()) {
				$scope.user.ready = true;

				$scope.setUserAction();

				$scope.user.selectedCard = false;

				$scope.saveUserLocalData();
			}

			$scope.update();
		};

		$scope.getButtonsStatus = function () {
			var res = false;

			if ($scope.getCurrentStage() == 'wait' || $scope.getCurrentStage() == 'watch' || $scope.user.ready) {
				res = true;
			}

			return res;
		};

		$scope.checkUserStatus = function () {
			if ($scope.user && $scope.getUserId() == $scope.game.leader) {
				$scope.user.status = "leader";
			} else {
				$scope.user.status = "minor";
			}

			if ($scope.config.isNewStage) {
			    console.log("checkUserStatus");
			    $scope.user.ready = false;
			}

			$scope.update();
		};

		$scope.checkGameProgress = function () {
			$scope.setUserAction();

			$scope.update();
		};

		$scope.saveUserLocalData = function () {
			if ($scope.game && $scope.user) {
				localStorage.setItem("UserCards", JSON.stringify($scope.user.cards));
			}
		};

		$scope.clearUserLocalData = function () {
			localStorage.removeItem("UserCards");
		};

		$scope.getLocalUserData = function () {
			var user = JSON.parse(localStorage.getItem('User'));

			return user;
		};

		$scope.checkLocalUser = function () {
			var user = $scope.getLocalUserData();

			if (user) {
				$scope.logUser(user);

				$scope.checkGameProgress();

				$scope.setUserAction();
			}

			$scope.update();
		};

		$scope.initUser = function () {
			console.log("initUser");

			var ind = ($scope.playersList) ? ($scope.playersList.indexOf($scope.user)) : -1;

			if ( (ind + 1)) {
				$scope.user = new User({
					id: ind,

					cards: []
				});

				$scope.config.isAccessClosed = false;

				$scope.updateView();
			} else {
				$scope.config.isAccessClosed = true;
			}

			$scope.update();
		};


		$scope.updateView = function () {
			$scope.checkUserStatus();

			var stage = $scope.getCurrentStage();

			angular.element(".card.active").removeClass("active");

			if($scope.isNewStage) {
                $scope.lastSelected = false;
			}

			if (stage == "write&select") {
				$scope.config.canWrite = true;
				$scope.user.word = "";
			} else { $scope.config.canWrite = false; }

			if (stage == "write&select" || stage == "select") {
			    $scope.config.canSelect = true;
			} else {
			    $scope.config.canSelect = false;
			}

			if (stage == "write&select" || stage == "select" || stage == "guess") {
			    $scope.config.canAction = true;
			} else { $scope.canAction = false; }

			if (stage == "guess" || stage == "watch" || stage == "end") {
			    $scope.config.showSelected = true;
			} else $scope.config.showSelected = false;

			if (stage == "guess") {
			    $scope.config.canGuess = true;
			} else $scope.config.canGuess = false;

			if (stage == "wait" || stage == "watch") {
				if (!$scope.user.ready) {
					$scope.user.ready = true;
					$scope.setUserAction();
				}
			}

			if (stage == "end") {
				$scope.clearUserData();
				$scope.config.isStageEnd = true;
				$scope.config.showSelectedCardInfo = true;

				if(!$scope.game.scoresWasAdded) $scope.socket.emit('mathScores', {});

			} else {
			    $scope.config.isStageEnd = false;
			    $scope.config.showSelectedCardInfo = false;
			}

			$scope.update();
		};

		$scope.update = function () {
			if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') $scope.$apply();
		};

		$scope.init = function () {
			$scope.initText();
			$scope.checkLocalUser();

			$scope.update();
		};

		$scope.$on('$viewContentLoaded', $scope.init());
	});

	myApp.directive("userCard", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.selectCard("userCard", attrs["userCard"], element);
			});
		}
	})
	.directive("statusBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.readyBtnCallback(scope.userWord);
			});
		}
	})
	.directive("roundBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.endRound(attrs['roundBtn']);
			});
		}
	})
	.directive("stageBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.switchStage();
			});
		}
	})
	.directive("logBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.logUser(scope.userName);
			});
		}
	})
	.directive("startBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
			    scope.startGame({
			        minPlayers: scope.minPlayers,
			        maxRound: scope.maxRound,
                    maxScore: scope.maxScore
			    });
			});
		}
	})
    .directive("restartBtn", function () {
        return function (scope, element, attrs) {
            element.on("click", function () {
                scope.restartServer();
            });
        }
    })
	.directive("cpanelBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				switch (attrs["cpanelBtn"]) {
					case "userData":
						console.log(scope.user);
						break;
					case "gameData":
						console.log(scope.game);
						break;
				    case "gameRestart":
				        scope.startGame();
				        break;
				    case "config":
				        console.log(scope.config, scope.playersList);
				        break;
				    case "update":
				        scope.update();
				        break;
					case "toggle":
						angular.element('.control-panel').toggleClass("active");
						break;
				}
			});
		}
	})
	.directive("tableCard", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.selectCard("tableCard", attrs["tableCard"], element);
			});
		}
	})
	.directive("userToggle", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.toggleUserNav();
			});
		}
	})
	.directive("userNavBtn", function () {
		return function (scope, element, attrs) {
			element.on("click", function () {
				scope.userNavAction(attrs['userNavBtn']);
				scope.toggleUserNav();
			});
		}
	})
	.directive("languageSelect", function () {
		return function (scope, element, attrs) {
			element.on("change", function () {
				scope.initText();
			});
		}
	});

}