/*global _ */

'use strict';

// Promises to load movie, showtime, and metadata lists
function JSONDataProvider($http) {
    return {
        movies: $http.get('siff2013-movies.json'),
        metadata: $http.get('siff2013-metadata.json'),
        showtimes: $http.get('siff2013-showtimes.json')
    };
}

// Store state and values of movie list filters
function FilterModel(dataProvider) {
    var Filter = function(name, values) {
        return {
            name: name,
            attribute: name.toLowerCase(),
            value: 'Any',
            values: _.map(_.pairs(values), function(v) { return { id: v[0], text: v[1] }; })
        };
    };

    // Create filters when metadata is loaded
    var filters = [];
    dataProvider.metadata.then(function(result) {
        var metadata = result.data;
        filters.push(new Filter('Section', metadata.sections));
        filters.push(new Filter('Mood', metadata.moods));
        filters.push(new Filter('Genre', metadata.genres));
        filters.push(new Filter('Country', metadata.countries));
    });

    return {
        // List all filters
        enumerate: function() {
            return filters;
        },
        // Clear all filters
        clear: function() {
            _.each(filters, function(f) { f.value = 'Any'; });
        },
        // Return true if any filters are actively applied (i.e. not equal to default 'Any' value)
        areActive: function() {
            return _.some(filters, function(f) { return f.value !== 'Any'; });
        },
        // Return true if provided movie passes all filters
        filterMovie: function(movie) {
            return _.every(filters, function(f) {
                return f.value === 'Any' || movie[f.attribute] === Number(f.value) || _.contains(movie[f.attribute], Number(f.value));
            });
        }
    };
}

// Store theater state
function TheaterModel(dataProvider) {
    var theaters = {};

    // Add theaters to map when theater data is loaded
    dataProvider.metadata.then(function(result) {
        var metadata = result.data;
        _.each(metadata.theaters, function(name, id) {
            theaters[id] = {
                name: name,
                active: true
            };
        });
    });

    return theaters;
}

// Store showtimes for lookup during scheduling
function ShowtimeModel(dataProvider) {
    var showtimes = {};

    // Add showtimes when data is loaded
    dataProvider.showtimes.then(function(result) {
        _.each(result.data, function(showtime, id) {
            showtimes[id] = showtime;
            showtimes[id].start = new Date(showtimes[id].start);
            showtimes[id].end = new Date(showtimes[id].end);
        });
    });

    return showtimes;
}

// Store movie list and associated movie state
function MovieModel($q, dataProvider) {
    var movies = [],
        movieNames = {},
        searchText = '',
        paging = { pageSize: 20, page: 1 },
        loaded = $q.defer();

    // Process movies when data is loaded
    dataProvider.movies.then(function(result) {
        _.each(result.data, function(movie) {
            movies.push(movie);
            // Default all movie to unselected 
            movie.selected = false;
            // Build lookup table of movie names
            movieNames[movie.id] = movie.title;
            // Notify controller that movies are loaded
            loaded.resolve();
        });
    });

    return {
        // List all movies
        enumerate: function() {
            return movies;
        },
        // Clear all selected movies
        clear: function() {
            _.each(movies, function(m) { m.selected = false; });
        },
        // Lookup name of movie by movie ID
        getName: function(id) {
            return movieNames[id];
        },
        // Return true if any movies are selected
        areSelected: function() {
            return _.some(movies, function(m) { return m.selected; });
        },
        // Return a list of selected movies
        getSelected: function() {
            return _.filter(movies, function (m) { return m.selected === true; });
        },
        // Expose state for binding to views
        searchText: searchText,
        paging: paging,
        // Promise to notify when movie data is loaded
        loaded: loaded.promise
    };
}

// Store state for schedule generation options
function OptionsModel(scheduler, theaters) {

    var preferWeekends = { active: false },
        avoidWeekdays = { active: true, after: 9, before: 18 },
        transitBufferMinutes = { value: 60 },
        preferTime = { early: false, late: false },
        hours = _.map(_.range(24), function(i) {
            // Build list of hours for display and selection
            var hour = i > 12 ? i - 12 : i,
                ampm = i > 12 ? 'PM' : 'AM',
                text = i === 0 ? 'Midnight' : hour + ':00 ' + ampm;
            return {
                display: text,
                value: i
            };
        });

    return {
        // Expose options state to controller and view
        preferWeekends: preferWeekends,
        avoidWeekdays: avoidWeekdays,
        transitBufferMinutes: transitBufferMinutes,
        hours: hours,
        preferTime: preferTime,
        // Build list of filtering functions for scheduler, based on selected options
        getFilters: function() {
            var filters = [];
            // Apply avoid weekdays filter if selected
            if (avoidWeekdays.active) {
                filters.push(scheduler.filterWeekdays(avoidWeekdays.after, avoidWeekdays.before));
            }
            // Apply theater filter for all inactive theaters
            var filteredTheaters = [];
            _.each(theaters, function(theater, id) {
                if (!theater.active) {
                    filteredTheaters.push(Number(id));
                }
            });
            if (filteredTheaters.length > 0) {
                filters.push(scheduler.filterTheaters(filteredTheaters));
            }
            return filters;
        },
        // Build list of weight functions for scheduler, based on selected options
        getWeights: function() {
            var weights = [];
            if (preferWeekends.active) {
                weights.push(scheduler.preferWeekends);
            }
            if (preferTime.early) {
                weights.push(scheduler.preferEarlier);
            }
            if (preferTime.late) {
                weights.push(scheduler.preferLater);
            }
            return weights;
        }
    };
}

// Store state of scheduled and conflicting movies
function ScheduleModel(movies, theaters, showtimes, options, scheduler) {
    var schedule = [],
        conflicts = [],
        // State for showing alert dialogs on schedule page
        alerts = {
            suggested: true,
            conflicts: true
        },
        monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December' ];

    // Format a datetime into a human readable string
    var formatTime = function(datetime) {
        var hour = datetime.getHours() > 12 ? datetime.getHours() - 12 : datetime.getHours();
        var minutes = datetime.getMinutes() < 10 ? '0' + String(datetime.getMinutes()) : String(datetime.getMinutes());
        var ampm = datetime.getHours() > 11 ? 'PM' : 'AM';
        return hour + ':' + minutes + ' ' + ampm;
    };

    return {
        alerts: alerts,
        // Build schedule for selected films
        generate: function() {
            // Get showtimes for each selected movie
            var selected = {};
            _.each(movies.getSelected(), function (movie) {
                _.each(movie.showtimes, function (showtimeId) {
                    selected[showtimeId] = showtimes[showtimeId];
                });
            });
            // Generate schedule
            var results = scheduler.buildSchedule(
                            selected,
                            options.getFilters(),
                            options.getWeights(),
                            options.transitBufferMinutes.value
                        );
            // Populate scheduled showtimes and conflicting movies
            schedule.length = 0;
            _.each(results.showtimes, function(showtime) {
                schedule.push({
                    start: showtime.start,
                    startDate: monthNames[showtime.start.getMonth()] + ' ' + showtime.start.getDate(),
                    movie: movies.getName(showtime.movie),
                    startTime: formatTime(showtime.start),
                    theater: theaters[showtime.theater].name
                });
            });
            // Populate conflicting movies list
            conflicts.length = 0;
            _.each(results.conflicts, function(conflict) {
                conflicts.push({
                    movie: movies.getName(conflict.id),
                    showtimes: _.map(conflict.showtimes, function(showtime) {
                        return {
                            start: showtime.start,
                            startDate: monthNames[showtime.start.getMonth()] + ' ' + showtime.start.getDate(),
                            startTime: formatTime(showtime.start),
                            theater: theaters[showtime.theater].name
                        };
                    })
                });
            });
        },
        getShowtimes: function() {
            return schedule;
        },
        getConflictMovies: function() {
            return conflicts;
        },
        hasConflictMovies: function() {
            return conflicts.length > 0;
        }
    };
}