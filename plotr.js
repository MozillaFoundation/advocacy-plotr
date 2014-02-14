// (function() {
	// Function global to uncomment when push into someone else code, keep my vars mine
	'use strict';

	var canvas_width = d3.select('#chart-canvas').node().offsetWidth;

	var teamColorScale = d3.scale.ordinal()
		.domain(['BRCK', 'CrisisNet', 'Crowdmap', 'External Projects', 'MAVC', 'Operations', 'RRI', 'V3'])
		//.range(['#e45f56',' #d75c37','#fff568','#a3d39c','#4aaaa5','#4aaaa5','#334455','#260126'])
		.range(['#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#abdda4', '#66c2a5', '#3288bd']);

	var priorityScale = d3.scale.linear()
		// .domain([-1, 0, 1])
		.range(['#ffffb2', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026']);

	var xScale = d3.time.scale()
		.rangeRound([125, canvas_width]);


	var data, bars;

	var number_of_bars, canvas_height;

	 // Compute the height our canvas needs to be once we get the data
	var bar_height = 20;
	var bar_margin_bottom = 10;
	var container_top_padding = 30;
	var container_bottom_padding = 40;

	var color_selector, filter_selector;

	var today = new Date();

	var ganttBarContainer;


	/*
	 * Load in data
	 */
	 // Data comes in as a simple updateable csv, so names entities, values can update
	 // Totes arbitrary values at this point for "priority", fix that
	 // Priority is a column field because there's probably some # value we'll want to sort deliverables by

	var dateFormat = d3.time.format('%m/%d/%y');

	function tidyData(csv) {
		// console.log(data)
		data = csv;
		console.log('Handle data');
		// Tidy all the data in to the correct types as CSV gives everything as a string
		data.forEach(function(d, i) {
			d.id = i;
			d.start_date = dateFormat.parse(d.start_date);
			d.end_date = dateFormat.parse(d.end_date);
			d.priority = parseInt(d.priority);
		});
		// Set priority extent and scaling for whatever amount you want to prioritize (resources, counts, downloads, anything numeric)
		var priority_extent = d3.extent(data, function(d) {return d.priority});
		console.log(priority_extent);
		priorityScale.domain([-50, 50]);

		// Find min/max of our dates
		var min = d3.min(data, function(d) { return d.start_date });
		var max = d3.max(data, function(d) { return d.end_date });

		xScale.domain([min, max]);

		number_of_bars = data.length;
		canvas_height = number_of_bars * (bar_height + bar_margin_bottom) + container_top_padding + container_bottom_padding;

		console.log(data);
	}


	function initialRender() {
		// Create svg container
		var svg = d3.select('#svg-canvas')
			.append('svg')
				.attr('width', canvas_width)
				.attr('height', canvas_height);

		// Create base axis; assign scale made up above
		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('bottom');

		// Bottom Axis
		var btmAxis = svg.append('g')
			.attr('transform', 'translate(0,' + (canvas_height - 30) + ')')
			.attr('class', 'axis')
			.call(xAxis);

		// Top Axis
		var topAxis = svg.append('g')
			.attr('transform', 'translate(0,10)')
			.attr('class', 'axis')
			.call(xAxis);

		// Lines
		var line = svg.append('g')
			.selectAll('line')
			.data(xScale.ticks(10))
			.enter()
			.append('line')
				.attr('x1', xScale)
				.attr('x2', xScale)
				.attr('y1', 30)
				.attr('y2', canvas_height - 25)
				.style('stroke', '#ccc');

		var todayline = svg.append('line')
			.datum(today)
			// .datum(new Date(2014,1,14))
			.attr('x1', xScale)
			.attr('x2', xScale)
			.attr('y1', 0)
			.attr('y2', canvas_height - 25)
			.style('stroke', '#c00');


		d3.select('#chart-canvas').style('height', canvas_height + 'px');


		ganttBarContainer = d3.select('#gantt-bar-container')
			.on('mousemove', function(d, i) {
				// Place mouse move on bar-container so the tooltip renders over the bars but sets to the xy of the bar it tips
				var xy = d3.mouse(this);
				// Update Tooltip Position & value
				tooltip
					.style('left', xy[0] + 'px')
					.style('top', xy[1] + 'px');
			});

		ganttBarContainer.append('div')
			.datum(today)
			.text('Today')
			.attr('class', 'todaymarker')
			.style('position', 'absolute')
			.style('top', '0px')
			.style('left', function(d) { return xScale(d) + 'px' });
	}

	var tooltip = d3.select('#tooltip');

	function render() {
		var filteredData = data;

		if (filter_selector) {
			filteredData = data.filter(function(d) { return d.type == filter_selector });
		}

		var barWrappers = ganttBarContainer.selectAll('.bar-wrapper')
			.data(filteredData, function(d) { return d.id });

		var bwe = barWrappers
			.enter()
			.append('div')
			.attr('class', function(d) { return 'bar-wrapper ' + d.type })
			.on('mouseover', function(d, i) {
				var tt = '';
				tt += '<p class="heading"><span id="keyword">' + d.team + '</span></p>';
				tt += '<p class="indent"><span id="bar-data">' + d.deliverable + '</span></p>';
				tt += '<p class="indent"><span id="cpcVal">' + dateFormat(d.start_date) + ' - ' + dateFormat(d.end_date) + '</span></p>';

				tooltip
					.style('border-left', '3px solid ' + teamColorScale(d.team))
					.html(tt);

				tooltip.style('display', 'block');
			})
			.on('mouseout', function(d, i) {
				tooltip.style('display', 'none');
			});

		bars = bwe
			.append('div')
				.attr('class', 'bar')
				.style('margin-left', function(d, i) { return xScale(d.start_date) + 'px' })
				.style('width', function(d, i) { return xScale(d.end_date) - xScale(d.start_date) + 'px' });

		bars
			.append('div')
				.attr('class', 'bar-name')
				.text(function(d) { return d.deliverable });

		barWrappers.selectAll('.bar')
			.style('background', function(d) {
				if (color_selector == 'priority') {
					return priorityScale(d.priority);
				}
				if (color_selector == 'team') {
					return teamColorScale(d.team);
				}
			});


		barWrappers
			.transition()
			.duration(600)
			// .delay(function(d, i) { return i * 15 })
			.style('display', 'block')
			.style('opacity', 1)
			.style('top', function(d, i) {
				return i * (bar_height + bar_margin_bottom) + 'px';
			});

		barWrappers
			.exit()
			.transition()
			.style('opacity', 1e-6)
			.transition()
			.style('display', 'none');


	}

	// Sorting buttons
	// So let's make a simple sort_ascending boolean variable and set it to true
	var sort_ascending = true;

	// Use d3 for events
	d3.selectAll('#sorter li')
		.on('click', function() {
		// Set it to what it isn't, if it was true, make it false and vice versa
		// So, when you click a button twice, it will flop its sort order; a simple toggle
		sort_ascending = !sort_ascending;
		var sorter_selector = d3.select(this).attr('data-sorter');
		console.log('SORT:', sorter_selector);

		data.sort(function(a, b) {
			if (sort_ascending) {
				return d3.ascending(a[sorter_selector], b[sorter_selector]);
			} else {
				return d3.descending(a[sorter_selector], b[sorter_selector]);
			}
		});
		// console.log(JSON.stringify(data.slice(0,5)))
		render();
	});

	// TODO use d3 for events
	// Filter buttons
	d3.selectAll('#filter li').on('click', function() {
		filter_selector = d3.select(this).attr('data-filter');
		render();
	});

	// Color buttons
	d3.selectAll('#color li').on('click', function() {
		color_selector = d3.select(this).attr('data-color');
		render(data);
	});

	d3.csv('data/sample_data.csv', function(csv) {
		tidyData(csv);
		initialRender();
		render();
	});

// })();