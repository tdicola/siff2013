/*global describe, it, expect, _, Scheduler */
'use strict';

(function () {
	describe('Scheduler', function() {
		// Populate test showtime data for testing
		var scheduler = new Scheduler();

		describe('isConflict function', function() {
			it('should return true for overlapping ranges', function() {
				expect(scheduler.isConflict(
					new Date(2013, 4, 11, 10),
					new Date(2013, 4, 11, 12),
					new Date(2013, 4, 11, 11),
					new Date(2013, 4, 11, 13)
					)).is.true;
				expect(scheduler.isConflict(
					new Date(2013, 4, 11, 11),
					new Date(2013, 4, 11, 13),
					new Date(2013, 4, 11, 10),
					new Date(2013, 4, 11, 12)
					)).is.true;
			});

			it('should return false for non-overlapping ranges', function() {
				expect(scheduler.isConflict(
					new Date(2013, 4, 11, 10),
					new Date(2013, 4, 11, 12),
					new Date(2013, 4, 11, 14),
					new Date(2013, 4, 11, 16)
					)).is.false;
			});
		});

		describe('hourFloor function', function() {
			it('should return the lower hour close to a given time', function() {
				expect(scheduler.hourFloor(new Date(2013, 4, 11, 17, 23))).to.deep.equal(
					new Date(2013, 4, 11, 17));
				expect(scheduler.hourFloor(new Date(2013, 4, 11, 17))).to.deep.equal(
					new Date(2013, 4, 11, 17));
			});
		});

		describe('hourCeil function', function() {
			it('should return the higher hour close to a given time', function() {
				expect(scheduler.hourCeil(new Date(2013, 4, 11, 17, 23))).to.deep.equal(
					new Date(2013, 4, 11, 18));
				expect(scheduler.hourCeil(new Date(2013, 4, 11, 17))).to.deep.equal(
					new Date(2013, 4, 11, 17));
			});
		});

		describe('hourRange function', function() {
			it('should return number of hours crossed in range of t1 and t2', function() {
				expect(scheduler.hourRange(new Date(2013, 4, 11, 15, 33),
					new Date(2013, 4, 11, 17))).to.equal(2);
			});

			it('should work when t2 is earlier than t1', function() {
				expect(scheduler.hourRange(new Date(2013, 4, 11, 17),
					new Date(2013, 4, 11, 15, 33))).to.equal(2);
			});

			it('should return 0 when t1 equals t2', function() {
				expect(scheduler.hourRange(new Date(2013, 4, 11, 17),
					new Date(2013, 4, 11, 17))).to.equal(0);
			});
		});

		describe('minValues function', function() {
			it('should return all the minimum values from a collection', function() {
				var result = scheduler.minValues([1, 2, 3, 1, 1, 5, 9]);
				expect(result.min).to.equal(1);
				expect(result.values).to.deep.equal([1, 1, 1]);

				result = scheduler.minValues([1, 2, 3]);
				expect(result.min).to.equal(1);
				expect(result.values).to.deep.equal([1]);
			});
		});

		describe('addMinutes function', function() {
			it('should add minutes to the given time', function() {
				var time = new Date(2013, 4, 16, 8, 23, 33);
				expect(scheduler.addMinutes(time, 22)).to.deep.equal(new Date(2013, 4, 16, 8, 45, 33));
				expect(scheduler.addMinutes(time, 45)).to.deep.equal(new Date(2013, 4, 16, 9, 8, 33));
				expect(scheduler.addMinutes(time, -22)).to.deep.equal(new Date(2013, 4, 16, 8, 1, 33));
			});
		});

		describe('minuteDiff function', function() {
			it('should return difference in minutes between time arguments regardless of their order', function() {
				expect(scheduler.minuteDiff(new Date(2013, 4, 16, 4, 2),
											new Date(2013, 4, 16, 9, 33))).to.equal(331);
				expect(scheduler.minuteDiff(new Date(2013, 4, 16, 9, 33),
											new Date(2013, 4, 16, 4, 2))).to.equal(331);
			});
		});

		var combinations = function(values) {
			var results = [];
			for (var i = 0; i < values.length; ++i) {
				for (var j = i+1; j < values.length; ++j) {
					results.push([values[i], values[j]]);
				}
			}
			return results;
		};

		describe('buildSchedule function', function() {
			it('should try to find a single showtime that does not conflict for each movie', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 11, 15), end: new Date(2013, 4, 11, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 12, 15), end: new Date(2013, 4, 12, 17) },
					2: { movie: 1, theater: 1, start: new Date(2013, 4, 13, 15), end: new Date(2013, 4, 13, 17) },

					3: { movie: 2, theater: 1, start: new Date(2013, 4, 11, 15), end: new Date(2013, 4, 11, 17) },
					4: { movie: 2, theater: 2, start: new Date(2013, 4, 12,  5), end: new Date(2013, 4, 12,  7) },

					5: { movie: 3, theater: 3, start: new Date(2013, 4, 11, 15), end: new Date(2013, 4, 11, 17) },
					6: { movie: 3, theater: 3, start: new Date(2013, 4, 12,  5), end: new Date(2013, 4, 12,  7) },
					7: { movie: 3, theater: 3, start: new Date(2013, 4, 17, 15), end: new Date(2013, 4, 17, 17, 22) },

					8: { movie: 4, theater: 1, start: new Date(2013, 4, 17, 12), end: new Date(2013, 4, 17, 14, 22) },
					9: { movie: 4, theater: 1, start: new Date(2013, 4, 18, 15), end: new Date(2013, 4, 18, 17, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [], 60);

				expect(schedule.showtimes.length).to.equal(4);
				expect(_.some(_.map(combinations(schedule.showtimes), function(c) {
					return scheduler.isConflict(c[0].start, c[0].end, c[1].start, c[1].end);
				}))).is.false;
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should not schedule shows in different theaters back to back without enough transit time', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 11, 15), end: new Date(2013, 4, 11, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 12, 15), end: new Date(2013, 4, 12, 17) },
					2: { movie: 2, theater: 2, start: new Date(2013, 4, 11, 13), end: new Date(2013, 4, 11, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [], 60);

				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[2]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should schedule shows in different theaters back to back if there is enough transit time', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 11, 15), end: new Date(2013, 4, 11, 17) },
					1: { movie: 2, theater: 2, start: new Date(2013, 4, 11, 13), end: new Date(2013, 4, 11, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [], 10);

				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should schedule shows in the same theater back to back regardless of transit time', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 11, 15), end: new Date(2013, 4, 11, 17) },
					1: { movie: 2, theater: 1, start: new Date(2013, 4, 11, 13), end: new Date(2013, 4, 11, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [], 100);

				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should support multiple filters', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 2, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
					2: { movie: 2, theater: 3, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [scheduler.filterTheaters([3]), scheduler.filterWeekdays(9, 17)], [], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(_.pluck(schedule.conflicts,'id')).to.deep.equal([2]);
			});

			it('should return movies which could not be scheduled', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 2, theater: 2, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
					2: { movie: 3, theater: 3, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.conflicts.length).to.equal(2);
				expect(_.pluck(schedule.conflicts, 'id')).to.deep.equal([2, 3]);
			});
		});

		describe('filterWeekdays function', function() {
			it('should not schedule weekday shows that fall within filtered time range', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [scheduler.filterWeekdays(9, 17)], [], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should schedule weekday shows that fall outside filtered time range', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 18), end: new Date(2013, 4, 16, 19) },
					1: { movie: 2, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [scheduler.filterWeekdays(9, 17)], [], 100);

				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should not count memorial day as a week day', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 27, 15), end: new Date(2013, 4, 27, 17) },
					1: { movie: 2, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [scheduler.filterWeekdays(9, 17)], [], 100);

				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});
		});

		describe('filterTheaters function', function() {
			it('should not schedule shows in a filtered theater', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 2, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
					2: { movie: 2, theater: 3, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [scheduler.filterTheaters([1, 3])], [], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(_.pluck(schedule.conflicts, 'id')).to.deep.equal([2]);
			});
		});

		describe('preferWeekends function', function() {
			it('should schedule weekend shows instead of weekday shows when neither have conflicts', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferWeekends], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should not schedule weekend shows when they conflict with other shows', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
					2: { movie: 2, theater: 2, start: new Date(2013, 4, 18, 14), end: new Date(2013, 4, 18, 15, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferWeekends], 100);
				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[2]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should schedule memorial day shows instead of weekday shows when neither have conflicts', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 27, 15), end: new Date(2013, 4, 27, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 13), end: new Date(2013, 4, 16, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferWeekends], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.conflicts).to.deep.equal([]);
			});
		});

		describe('preferLater function', function() {
			it('should schedule late shows instead of early shows when neither have conflicts', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferLater], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should not schedule late shows when they conflict with other shows', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 13), end: new Date(2013, 4, 16, 14) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 15), end: new Date(2013, 4, 18, 17, 22) },
					2: { movie: 2, theater: 2, start: new Date(2013, 4, 18, 14), end: new Date(2013, 4, 18, 15, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferLater], 100);
				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[0]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[2]);
				expect(schedule.conflicts).to.deep.equal([]);
			});
		});

		describe('preferEarlier function', function() {
			it('should schedule early shows instead of late shows when neither have conflicts', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 15), end: new Date(2013, 4, 16, 17) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 13), end: new Date(2013, 4, 18, 14, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferEarlier], 100);

				expect(schedule.showtimes.length).to.equal(1);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(schedule.conflicts).to.deep.equal([]);
			});

			it('should not schedule early shows when they conflict with other shows', function() {
				var showtimes = {
					0: { movie: 1, theater: 1, start: new Date(2013, 4, 16, 13), end: new Date(2013, 4, 16, 14, 55) },
					1: { movie: 1, theater: 1, start: new Date(2013, 4, 18, 15), end: new Date(2013, 4, 18, 17, 22) },
					2: { movie: 2, theater: 2, start: new Date(2013, 4, 16, 14), end: new Date(2013, 4, 16, 15, 22) },
				};

				var schedule = scheduler.buildSchedule(showtimes, [], [scheduler.preferEarlier], 100);
				expect(schedule.showtimes.length).to.equal(2);
				expect(schedule.showtimes[0]).to.deep.equal(showtimes[1]);
				expect(schedule.showtimes[1]).to.deep.equal(showtimes[2]);
				expect(schedule.conflicts).to.deep.equal([]);
			});
		});
	});
})();
