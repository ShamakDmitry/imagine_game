function getExcuse() {
	var excuses = [
		"Oбед, приходите позже или неси вкусняшки",
		"Перерыв 15 - ??? минут.",
		"Скоро буду, подождите!"
	];

	var excuse = excuses[Math.floor(Math.random() * excuses.length)];

	return excuse;
}

if (myApp) {
	myApp.config(function ($routeProvider) {
		$routeProvider.when('/table', {
			templateUrl: '/assets/view/table.html',
			controller: 'Home'
		})
		.otherwise({
			template: '<h3 class="nopage error">' + getExcuse() + '</h3>'
		})
	});
}