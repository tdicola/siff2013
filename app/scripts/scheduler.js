/*global _ */

'use strict';

function Scheduler() {
    var scheduler = {
        // Return true if the specified time ranges overlap
        isConflict: function(r1start, r1end, r2start, r2end) {
            if ((r1start <= r2start && r1end >= r2start) ||
                (r2start <= r1start && r2end >= r1start)) {
                return true;
            }
            else {
                return false;
            }
        },

        // Find the lowest integer hour for the specified time
        hourFloor: function(time) {
            return new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours());
        },

        // Find the highest integer hour for the specified time
        hourCeil: function(time) {
            var result = scheduler.hourFloor(time);
            if (time.getMinutes() > 0 || time.getSeconds() > 0 || time.getMilliseconds() > 0) {
                result.setHours(result.getHours() + 1);
            }
            return result;
        },

        // Count how many hours are crossed by specified range of time
        hourRange: function(t1, t2) {
            var low = scheduler.hourFloor(t1 < t2 ? t1 : t2);
            var high = scheduler.hourCeil(t1 > t2 ? t1 : t2);
            return (high - low) / (60*60*1000);
        },

        // For each hour crossed by start and end call function
        enumerateHours: function(start, end, func) {
            var startHour = scheduler.hourFloor(start);
            for (var i = 0; i < scheduler.hourRange(start, end); ++i) {
                // Find the i'th hour past the start hour
                var hour = new Date(startHour.getTime());
                hour.setHours(start.getHours() + i);
                // Call the function
                func(hour);
            }
        },

        // Build a table for each hour and the associated showtimes occuring in that hour
        buildHourLookup: function(showtimes) {
            var hours = {};
            _.each(showtimes, function(showtime, id) {
                scheduler.enumerateHours(showtime.start, showtime.end, function(hour) {
                    // If there's no data for this hour yet initialize it to an empty array
                    if (!_.has(hours, hour)) {
                        hours[hour] = [];
                    }
                    // Add the showtime to the hour table
                    hours[hour].push({ id: id, showtime: showtime});
                });
            });
            return hours;
        },

        // Find all the minimum values in a list
        minValues: function(values, iterator) {
            return _.reduce(values,
                // Reduction function to find and store all minimum values
                function(memo, n) {
                    var val = n;
                    if (iterator) {
                        val = iterator(n);
                    }
                    if (val < memo.min) {
                        memo.min = val;
                        memo.values = [n];
                    }
                    else if (val === memo.min) {
                        memo.values.push(n);
                    }
                    return memo;
                },
                // Initial value
                { min: Number.MAX_VALUE, values: [] });
        },

        // Add minutes to specified time
        addMinutes: function(time, mins) {
            var result = new Date(time.getTime());
            result.setMinutes(time.getMinutes() + mins);
            return result;
        },

        // Find difference in minutes between two times
        minuteDiff: function(t1, t2) {
            var low = t1 < t2 ? t1 : t2;
            var high = t1 > t2 ? t1 : t2;
            return (high - low) / (60*1000);
        },

        // Return function to filter showtimes that occur during a weekday hour range
        filterWeekdays: function(start, end) {
            return function(showtime) {
                var startDate = new Date(showtime.start.getFullYear(),
                                         showtime.start.getMonth(),
                                         showtime.start.getDate(),
                                         start);
                var endDate = new Date(showtime.start.getFullYear(),
                                       showtime.start.getMonth(),
                                       showtime.start.getDate(),
                                       end);
                if (showtime.start.getDay() !== 0 && showtime.start.getDay() !== 6 &&  // Check it's not sunday or saturday
                    !(showtime.start.getMonth() === 4 && showtime.start.getDate() === 27) && // Check it's not memorial day
                    showtime.start >= startDate && showtime.start < endDate) { // Finally check the start time falls within the disallowed range
                    // Filter out the showtime
                    return true;
                }
                return false;
            };
        },

        // Return function to filter showtimes which occur in specified theaters
        filterTheaters: function(theaters) {
            return function(showtime) {
                return _.contains(theaters, showtime.theater);
            };
        },

        // Function to weight weekends lower (more likely to be chosen) than weekdays
        preferWeekends: function(showtime) {
            if (showtime.start.getDay() === 0 || // Check for sunday or saturday
                showtime.start.getDay() === 6 ||
                (showtime.start.getMonth() === 4 && showtime.start.getDate() === 27)) { // Check for memorial day
                return 0;
            }
            return 23;
        },

        // Function to weight later shows lower (more likely to be chosen) than other times
        preferLater: function(showtime) {
            return 23 - showtime.start.getHours();
        },

        // Function to weight earlier shows lower (more likely to be chosen)
        preferEarlier: function(showtime) {
            return showtime.start.getHours();
        },

        buildSchedule: function(showtimes, filters, weights, transitMins) {
            // Build showtime lookup for each movie
            var movies = _.groupBy(showtimes, 'movie');
            // Build hour lookup for quicker conflict detection
            var hours = scheduler.buildHourLookup(showtimes);

            // Initialize all showtimes as not removed, not chosen, and assign weights
            _.each(showtimes, function(sh) {
                sh.removed = false;
                sh.chosen = false;
                // Apply weights to showtime
                sh.weight = 0;
                _.each(weights, function(w) {
                    sh.weight += w(sh);
                });
            });

            // Mark showtimes which don't pass the filters as removed
            _.each(filters, function(filter) {
                _.each(showtimes, function(sh) {
                    if (filter(sh)) {
                        sh.removed = true;
                    }
                });
            });

            // Function to update the number of conflicts associated with each showtime
            var updateConflicts = function() {
                _.each(showtimes, function (sh, shId) {
                    if (!sh.removed) {
                        // Count the number of conflicts for each showtime that isn't removed
                        var conflicts = {};
                        // Pad start time by by transit buffer minutes to find conflicts
                        // with movies that end without enough transit buffer to make this showing.
                        scheduler.enumerateHours(
                            scheduler.addMinutes(sh.start, -transitMins),
                            scheduler.addMinutes(sh.end, transitMins),
                            function(hour) {
                                _.each(hours[hour], function (csh) {
                                    if (csh.id !== shId && (csh.showtime.chosen || !csh.showtime.removed)) {
                                        // If there is a conflict or there isn't enough
                                        // transit buffer between theaters consider it a conflict.
                                        if (scheduler.isConflict(sh.start, sh.end, csh.showtime.start, csh.showtime.end) ||
                                            (csh.showtime.end < sh.start && csh.showtime.theater !== sh.theater && scheduler.minuteDiff(csh.showtime.end, sh.start) < transitMins) ||
                                            (csh.showtime.start > sh.end && csh.showtime.theater !== sh.theater && scheduler.minuteDiff(csh.showtime.start, sh.end) < transitMins)) {
                                            conflicts[csh.id] = true;
                                        }
                                    }
                                });
                                sh.conflicts = _.keys(conflicts).length;
                            }
                        );
                    }
                });
            };

            updateConflicts();
            // Loop while there are movies that can be picked (i.e. are conflict free and not already removed)
            var sh = _.findWhere(showtimes, { removed: false,  conflicts: 0 });
            while (sh) {
                // Grab the all showtimes with no conflicts
                var candidates = _.where(movies[sh.movie], { removed: false, conflicts: 0 });
                // Find the lowest weighted showtimes and pick a random one
                candidates = scheduler.minValues(candidates, function(s) { return s.weight; });
                var best = candidates.values[_.random(candidates.values.length-1)];
                // Make the showtime as chosen and remove all other showtimes for that movie
                best.chosen = true;
                _.each(movies[best.movie], function(s) { s.removed = true; });
                // Update conflicts and find next best movie to schedule (is not removed and has no conflcits)
                updateConflicts();
                sh = _.findWhere(showtimes, { removed: false,  conflicts: 0 });
            }

            return {
                showtimes:  _.where(showtimes, { chosen: true }),
                // Find movies which have no chosen showtimes and return their IDs
                conflicts: _.where(
                                _.map(movies, function(showtimes, id) {
                                    return { id: Number(id),
                                        chosen: _.some(showtimes, function(sh) { return sh.chosen; }),
                                        showtimes: showtimes };
                                }),
                                { chosen: false })
            };
        }
    };
    return scheduler;
}