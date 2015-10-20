/*!
 * angular-masonry <%= pkg.version %>
 * Pascal Hartig, weluse GmbH, http://weluse.de/
 * License: MIT
 */
var mod = angular.module('wu.masonry', []).controller('MasonryCtrl', function controller ($scope, $element, $timeout) {
	var bricks = {};
	var schedule = [];
	var destroyed = false;
	var self = this;
	var timeout = null;
	this.scheduleMasonryOnce = function scheduleMasonryOnce() {
		var args = arguments;
		var found = schedule.filter(
			function filterFn (item) {
				return item[0] === args[0];
			}
		).length > 0;
		if (!found) {
			this.scheduleMasonry.apply(null, arguments);
		}
	};
	this.scheduleMasonry = function scheduleMasonry () {
		if (timeout) {
			$timeout.cancel(timeout);
		}
		schedule.push([].slice.call(arguments));
		timeout = $timeout(
			function runMasonry() {
				if (destroyed) {
					return;
				}
				schedule.forEach(
					function scheduleForEach (args) {
						$element.masonry.apply($element, args);
					}
				);
				schedule = [];
			},
			60
		);
	};
	this.appendBrick = function appendBrick (element, id) {
		function _append () {
			if (destroyed) {
				return;
			}
			if (Object.keys(bricks).length === 0) {
				$element.masonry('resize');
			}
			if (bricks[id] === undefined) {
				bricks[id] = true;
				$element.masonry('appended', element, true);
				self.scheduleMasonryOnce('reloadItems');
				self.scheduleMasonryOnce('layout');
			}
		};
		function _loaded () {
			element.addClass('loaded');
			$scope.$emit('masonry.imagesLoaded', element);
		};
		var has_fixed_dimension = element.find('[ng-img-preload-aspect-ratio]').length;
		if (has_fixed_dimension) {
			_append();
			element.imagesLoaded(_loaded);
		}
		else {
			element.imagesLoaded(function () {
				_append();
				_loaded();
			});
		}
	};
	this.removeBrick = function removeBrick(id, element) {
		if (destroyed) {
			return;
		}
		delete bricks[id];
		$element.masonry('remove', element);
		this.scheduleMasonryOnce('layout');
	};
	this.destroy = function destroy() {
		if ($element.data('masonry')) {
			$element.masonry('destroy');
		}
		$scope.$emit('masonry.destroyed');
		bricks = [];
		destroyed = true;
	};
	this.reload = function reload() {
		$element.masonry();
		$scope.$emit('masonry.reloaded');
	};
}).directive('masonry', function masonryDirective () {
	return {
		restrict: 'AE',
		controller: 'MasonryCtrl',
		link: {
			pre: function preLink(scope, element, attrs, ctrl) {
				var attrOptions = scope.$eval(attrs.masonry || attrs.masonryOptions);
				var options = angular.extend(attrOptions || {}, {
					itemSelector: attrs.itemSelector || '.masonry-brick',
					columnWidth: parseInt(attrs.columnWidth, 10)
				});
				element.masonry(options);
				scope.$emit('masonry.created', element);
				scope.$on('masonry.reload', function () {
					ctrl.reload();
				});
				scope.$on('$destroy', ctrl.destroy);
			}
		}
	};
}).directive('masonryBrick', function masonryBrickDirective () {
	return {
		restrict: 'AC',
		require: '^masonry',
		scope: true,
		link: {
			pre: function preLink(scope, element, attrs, ctrl) {
				var id = scope.$id
				var index;
				ctrl.appendBrick(element, id);
				element.on('$destroy', function () {
					ctrl.removeBrick(id, element);
				});
				scope.$watch('$index', function () {
					if (index !== undefined && index !== scope.$index) {
						ctrl.scheduleMasonryOnce('reloadItems');
						ctrl.scheduleMasonryOnce('layout');
					}
					index = scope.$index;
				});
			}
		}
	};
});

module.exports = mod.name;

