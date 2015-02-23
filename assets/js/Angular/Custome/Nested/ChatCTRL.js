if (myApp) {
	myApp.controller('Chat', function ($scope, $http, $location) {
		$scope.chat = [];

		$scope.hasNewMessages = false;
		$scope.isChatOpened = false;

		$scope.socket.on('connect', function () {
			console.log("socket connect");
			$scope.socket.emit("info", {
				text: (($scope.user.name) ? $scope.user.name : $scope.user) + " connected to chat",
				cls: "info"
			});
		});

		$scope.sendChatMessage = function () {
			var message = $scope.chatInput;

			var command = $scope.isCommand(message);

			if (command) {
				if ($scope[command]) {
					$scope[command]();
				}
			} else {
				$scope.socket.emit('msg', {
					author: $scope.getUserName($scope.user),
					image: true,
					cls: "person",
					text: message,
					date: "today",
					style: {
						'background-color': 'rgb(' + $scope.getRandomColorItem() + "," + $scope.getRandomColorItem() + "," + $scope.getRandomColorItem() + ')'
					}
				});
			}

			
			angular.element('#chat-msg').val('');
		};

		$scope.getRandomColorItem = function () {
			var color = Math.floor(Math.random() * 255);

			return color;
		};

		$scope.addMessage = function (msg) {
			if (msg.author && msg.author == $scope.user.name) msg.position = "right";
			else msg.position = "left";

			$scope.chat.push(msg);

			$scope.update();
		};

		$scope.socket.on('msg', function (msg) {
			$scope.addMessage(msg);

			if (!$scope.isChatOpened) {
				$scope.hasNewMessages = true;
			}

			var elem = angular.element('.chat-output')[0];
			elem.scrollTop = elem.scrollHeight;

			$scope.update();
		});

		$scope.socket.on('info', function (info) {
			$scope.addMessage(info);
		});

		$scope.socket.on('disconnect', function () {
			console.log("socket disconnect");
			$scope.socket.emit("info", {
				text: $scope.user.name + " left the chat",
				cls: "info",
			});
		});

		$scope.toggleChat = function () {
			$scope.isChatOpened = !$scope.isChatOpened;

			if ($scope.isChatOpened) {
				$scope.hasNewMessages = false;
			}

			angular.element('#chat').toggleClass('active');

			$scope.update();
		};

		$('form').submit(function () {
			$scope.sendChatMessage();
		});
	});

	myApp.directive('chatToggle', function () {
		return function (scope, element, attrs) {
			element.on('click', function () {
				scope.toggleChat();
			});
		}
	})
	.directive('sendBtn', function () {
		return function (scope, element, attrs) {
			element.on('click', function () {
				scope.sendChatMessage();
			});
		}
	});
}