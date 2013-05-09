/* global angular, JSONDataProvider, FilterModel, TheaterModel, ShowtimeModel,
	MovieModel, OptionsModel, Scheduler, ScheduleModel, MovieListCtrl,
	OptionsCtrl, ScheduleCtrl */

'use strict';

angular.module('siffscheduler', [])
	.factory('dataProvider', JSONDataProvider)
	.factory('filters', FilterModel)
	.factory('theaters', TheaterModel)
	.factory('showtimes', ShowtimeModel)
	.factory('movies', MovieModel)
	.factory('options', OptionsModel)
	.factory('scheduler', Scheduler)
	.factory('schedule', ScheduleModel)
	.controller('movieListCtrl', MovieListCtrl)
	.controller('optionsCtrl', OptionsCtrl)
	.controller('scheduleCtrl', ScheduleCtrl)
	.config(['$routeProvider', function($routeProvider) {
		$routeProvider
			.when('/',			{templateUrl: 'movie-list.html', controller: 'movieListCtrl'})
			.when('/options',	{templateUrl: 'options.html', controller: 'optionsCtrl'})
			.when('/schedule',	{templateUrl: 'schedule.html', controller: 'scheduleCtrl'})
			.otherwise({redirectTo: '/'});
	}]);