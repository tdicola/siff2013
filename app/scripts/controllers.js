/*global _ */

'use strict';

function MovieListCtrl($scope, $location, movies, schedule, filters) {
	$scope.movies = movies;
	$scope.filters = filters;
	$scope.filteredMovies = [];
	$scope.pageCount = 0;

	// Return true if a given movie's title or director matches search text
	$scope.searchTitleDirector = function(movie) {
		if (movies.searchText && movie.director) {
			return (movie.title.toLowerCase().indexOf(movies.searchText.toLowerCase()) !== -1 ||
					movie.director.toLowerCase().indexOf(movies.searchText.toLowerCase()) !== -1);
		}
		else if (movies.searchText) {
			return (movie.title.toLowerCase().indexOf(movies.searchText.toLowerCase()) !== -1);
		}
		else {
			return true;
		}
	};

	// Update the list of filtered movies
	$scope.filterMovies = function() {
		var list = movies.enumerate();
		// Apply filters
		list = _.filter(list, filters.filterMovie);
		list = _.filter(list, $scope.searchTitleDirector);
		// Sort
		list = _.sortBy(list, function(movie) { return movie.title; });
		// Update paging state
		$scope.pageCount = Math.ceil(list.length / movies.paging.pageSize);
		movies.paging.page = 1;
		// Update filtered movie list
		$scope.filteredMovies = list;
	};

	// Expose state for movie metadata being loaded
	var loaded = false;
	$scope.isLoaded = function() {
		return loaded;
	};
	// Promise to updated loaded state when movie data is loaded
	movies.loaded.then(function() {
		loaded = true;
		// Filter movies when data is loaded
		$scope.filterMovies();
	});

	// Update filter value and filter movies again
	$scope.setFilter = function(filter, value) {
		filter.value = value;
		$scope.filterMovies();
	};

	$scope.clearFilters = function() {
		filters.clear();
		$scope.filterMovies();
	};

	// Retrieve a page of movies
	$scope.getPage = function() {
		// Return entire list of it's smaller than a page size, or if page size is negative (show all pages option)
		if ($scope.filteredMovies.length <= movies.paging.pageSize || movies.paging.pageSize < 0) {
			return $scope.filteredMovies;
		}

		// Find page start and end indices (clamped to length of filtered movies)
		var start = (movies.paging.page - 1) * movies.paging.pageSize;
		var end = start + movies.paging.pageSize;
		end = end > $scope.filteredMovies.length ? $scope.filteredMovies.length : end;

		// Return nothing if requested page is past all movies
		if (start >= $scope.filteredMovies.length)
		{
			return [];
		}
		// Grab a page of movies
		else {
			return $scope.filteredMovies.slice(start, end);
		}
	};

	// Return true if paging the movie list
	$scope.isPaging = function() {
		return movies.paging.pageSize > 0;
	};

	$scope.nextPage = function() {
		if (movies.paging.page < $scope.pageCount) {
			movies.paging.page += 1;
		}
	};

	$scope.prevPage = function() {
		if (movies.paging.page > 1) {
			movies.paging.page -= 1;
		}
	};

	$scope.isPrevDisabled = function () {
		return !($scope.isPaging() && movies.paging.page > 1);
	};

	$scope.isNextDisabled = function () {
		return !($scope.isPaging() && movies.paging.page < $scope.pageCount);
	};

	// Switch between paging and showing all movies
	$scope.togglePaging = function() {
		if ($scope.isPaging()) {
			movies.paging.pageSize = -1;
		}
		else {
			movies.paging.pageSize = 20;
			movies.paging.page = 1;
		}
	};

	$scope.pagingState = function() {
		if ($scope.isPaging()) {
			return 'Show All';
		}
		else {
			return 'Show Pages';
		}
	};

	$scope.generateSchedule = function() {
		schedule.generate();
		$location.path('/schedule');
	};
}

function OptionsCtrl($scope, options, theaters) {
	$scope.options = options;
	$scope.theaters = theaters;
}

function ScheduleCtrl($scope, schedule) {
	$scope.schedule = schedule;
}