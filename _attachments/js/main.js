CARDVIZ = {
	MONTHS: [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	],

	init: function() {
		var width = $('#colors').width(),
			height = $('#colors').height(),
			radius = Math.min(width, height) / 2;

		var colors = d3.select('#colors').append('g')
			.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

		var partition = d3.layout.partition()
			.size([2 * Math.PI, radius * radius])
			.sort(function (a, b) { return b.frequency - a.frequency; })
			.children(function (d) { return d.values; })
			.value(function (d) { return d.frequency; });

		var arc = d3.svg.arc()
			.startAngle(function (d) { return d.x; })
			.endAngle(function (d) { return d.x + d.dx; })
			.innerRadius(function (d) { return Math.sqrt(d.y); })
			.outerRadius(function (d) { return Math.sqrt(d.y + d.dy); });

		var lScale = d3.scale.linear()
			.domain([1, 3])
			.range([0.9, 0.7]);

		// Get the color entries and construct the sunburst diagram.
		d3.json('/cards/_design/cardviz/_view/colors', function (json) {
			var onMouseOver = function (d) {

				// Recursively get all the IDs of cards below this node.
				var getIds = function (d) {
					var a = [];

					if (d.children) {
						for (var i = d.children.length - 1; i >= 0; i--) {
							a = a.concat(getIds(d.children[i]));
						}
					} else {
						return [d.id];
					}

					return a;
				};

				var cards = getIds(d),
					bars;

				var getSender = function (d) { 
					return d.id; 
				};

				var sentBy = function (el, idx, a) { 
					return (cards.indexOf(el) > -1);
				};

				hover = this;

				bars = d3.selectAll('#senders .bar');

				bars.filter(function (e) { return !e.values.map(getSender).some(sentBy); })
					.transition()
					.duration(500)
					.style('fill-opacity', 0.3);

				bars.filter(function (e) { return e.values.map(getSender).some(sentBy); })
					.transition()
					.duration(500)
					.style('fill-opacity', 1);
			};

			var onMouseOut = function (d) {
				if (hover === this) {
					hover = null;
					d3.selectAll('#senders .bar')
						.transition()
						.duration(500)
						.style('fill-opacity', 1);
				}
			};

			var cards = d3.nest()
				.key(function (d) { return d.key[0]; })
				.key(function (d) { return CARDVIZ.MONTHS[d.key[1]]; })
				.key(function (d) { return d.key[2]; })
				.rollup(function (d) { 
					return d.map(function(v) {
						return {
							'color': v.value.color,
							'frequency': v.value.frequency,
							'id': v.id
						};
					});
				});

			var cardData = partition.nodes({
				'key': 'cards',
				'values': cards.entries(json.rows)
			});

			// Use this to keep track of the element we're hovering over.
			var hover;

			colors.selectAll('path')
				.data(cardData)
				.enter()
				.append('path')
				.attr('display', function (d) { return (d.depth) ? null : 'none'; })
				.attr('d', arc)
				.style('fill', function (d) { 
					return (d.color) ? '#' + d.color : d3.hsl(0, 0, lScale(d.depth)).toString();
				})
				.style('cursor', function (d) {
					return (d.depth === 4) ? 'pointer' : null;
				})
				.on('click', function (d) {
					if (d.id) {
						$.fancybox.open('/cards/' + d.id + '/card.png');
					}
				})
				.on('mouseover', onMouseOver)
				.on('mouseout', onMouseOut);

			colors.selectAll('text')
				.data(cardData)
				.enter()
				.append('text')
				.attr('display', function (d) { return (d.depth && d.depth < 3) ? null : 'none'; })
				.attr("transform", function(d) {
				        return "translate(" + arc.centroid(d) + ")";
				      })
				.on('mouseover', onMouseOver)
				.on('mouseout', onMouseOut)
				.text(function (d) { return d.key; });
		});

		d3.json('/cards/_design/cardviz/_view/senders', function (json) {
			if (json) {
				var data = d3.nest()
					.key(function (d) { return d.key; })
					.entries(json.rows);

				var w = $('#senders').width(),
					h = $('#senders').width() / data.length,
					margin = Math.max(1, Math.floor(h * 0.1));

				var scale = d3.scale.linear()
					.domain([0, d3.max(data.map(function (d) {
						return d.values.length;
					}))])
					.range([0, (w - 65) * 0.9]);

				var hover;


				d3.select('#senders').selectAll('rect')
					.data(data)
					.enter()
					.append('rect')
					.attr('class', 'bar')
					.attr('x', 65)
					.attr('y', function (d, i) {
						return margin + (i * h);
					})
					.attr('width', function (d) {
						return scale(d.values.length);
					})
					.attr('height', h - (2 * margin))
					.on('mouseover', function (d) {
						var sentCards = d.values.map(function (e) { return e.id; });

						hover = this;

						d3.selectAll('.bar').filter(function (d) {
								return hover !== this;
							})
							.transition()
							.duration(500)
							.style('fill-opacity', 0.3);

						d3.selectAll('#colors path')
							.filter(function (d) {
								return (d.id && sentCards.indexOf(d.id) < 0);
							})
							.transition()
							.duration(500)
							.style('fill-opacity', 0.1);
					})
					.on('mouseout', function (d) {
							var sentCards = d.values.map(function (e) { return e.id; });

						if (this === hover) {
							hover = null;
							d3.selectAll('.bar').transition()
								.duration(500)
								.style('fill-opacity', 1);
							d3.selectAll('#colors path')
								.transition()
								.duration(500)
								.style('fill-opacity', 1);
						} else {
							d3.select(this).transition()
								.duration(500)
								.style('fill-opacity', 0.3);
							d3.selectAll('#colors path')
								.filter(function (d) {
									return (d.id && sentCards.indexOf(d.id) > -1);
								})
								.transition()
								.duration(500)
								.style('fill-opacity', 0.1);
						}
					})

				d3.select('#senders').selectAll('text')
					.data(data)
					.enter()
					.append('text')
					.attr('x', 60)
					.attr('y', function (d, i) {
						return i * h + (h / 2);
					})
					.text(function (d) {
						return d.key;
					});
			}
		});

		$(window).resize(function () {
			var svg = $('#colors');
			var w = svg.width();
			var h = svg.height();

			if (w < h) {
				colors.attr('transform', 'translate(' + w/2 + ',' + h/2 + ') scale(' + w/width + ')');
			} else {
				colors.attr('transform', 'translate(' + w/2 + ',' + h/2 + ') scale(' + h/height + ')');				
			}
		});
	}
};

window.jQuery(document).ready(CARDVIZ.init);