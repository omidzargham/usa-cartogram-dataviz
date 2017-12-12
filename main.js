// set width and height of main svg element 
var width = 1000,
    height = 500;

// adding svg element to body of html 
var svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

//colorscale for data points
var color = d3.scaleQuantize();

// the map projection we are using
var projection = d3.geoAlbersUsa();

// data structures for the data we are showing in our cartogram
var population = d3.map();
var medIncome = d3.map();

// scale for the radius of our circles (the circles represent the data- 
// either population or median income by state) 
// arbitrarily chose 8,60 because it most closely resembled desired output
var radius = d3.scaleSqrt().range([8,60]);

// our simulation, defined globally so we use it in the update function
var simulation;

// our legend, defined in globally so we can use it in the update function
var legend;

// boolean for whether we are showing population or median income
var showPop = true;

// use d3-queue to avoid callback hell, and manage how we load our datasets
// asynchronously and ensure the data finishes loading before we call main
d3.queue()
  .defer(d3.json, 'data/us-states-centroids.json')
  .defer(d3.csv, 'data/acs_pop_income.csv', function(d)  {
    // format our data so all the id's are 2 digits 
    if (d.id.length < 2) d.id = '0' + d.id;

    // populate our data structures with properly formatted and relevant 
    // data (with values coerced as integers)
    population.set(d.id, +d.toal_pop);
    medIncome.set(d.id, +d.median_income);
  })
  // await means not to call main until the previous two defers finish
  .await(main);

// our main callback after we load the data
function main(error, geojson) {
  if (error) throw error;
   // min and max values of our dataset 
   var extent = d3.extent(population.values());

   //set the domain of the radius scale to the extent 
  radius.domain(extent);

  // setting up color scales
  // extent[1] is the max value of the data
  // I am essentially dividing the max population by 5, so I partition 
  // the data into 5 buckets, which I use for the range of the colorscale
  // and the legend 
  var partitions = [];
  for (var i = 1; i < 6; i++){
    partitions.push((extent[1] / 5)*i);
  }

  color.domain([0, extent[1]])
  .range(partitions.map(function(d, i) {
    return d3.interpolateYlGnBu(i / (5 - 1));
  }));


  //refactoring the data into the structure that we want to create our cartogram 
  var nodes = geojson.features.map(function(d) {
    var point = projection(d.geometry.coordinates),
        value = population.get(d.id);

    return {
      id: d.id,
      name: d.properties.name,
      label: d.properties.label,
      coords: d.geometry.coordinates,
      x: point[0],
      y: point[1],
      x0: point[0],
      y0: point[1],
      r: radius(value),
      value: value
    };
  });

  // our simulation
  simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(1))
  .force('collision', d3.forceCollide().strength(1)
    .radius(function(d) {
    return d.r;
    }))
  .on('tick', ticked);
  
  // function for simulation, draws our circles and text labels in the 
  // main svg element 
  function ticked() {
    // draw our circles
    var bubbles = d3.select('svg')
       .selectAll('circle')
       .data(nodes, function(d) {
          return d.name;
       });
  
    bubbles.enter()
      .append('circle')
      // allows us to create and update bubbles at same time
      .merge(bubbles)
      .attr('r', function(d) {
        return d.r;
      })
      .attr('cx', function(d) {
        return d.x;
      })
      .attr('cy', function(d) {
        return d.y;
      })
      .attr('fill', function(d) {
        return color(d.value);
      })
      .attr('stroke', '#333')
      // when mouseover event on circle occurs, show the tooltip 
      .on('mouseover', function(d) {
        // localetostring -> adds commas to value
        if (showPop) {
          tooltip.html(d.name + "<br>" + d.value.toLocaleString());
        } else {
          tooltip.html(d.name + "<br>" + "$" + d.value.toLocaleString());
        }
        tooltip.style('visibility', 'visible');
        d3.select(this).attr('stroke', 'green');
      })
      // padding so the cursor doesnt overlap
      .on('mousemove', function() {
        tooltip.style('top', (d3.event.pageY - 10) + 'px')
          .style('left', (d3.event.pageX + 10) + 'px');
      
      })
      //when mouseout event occurs, hide the tooltip
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        d3.select(this).attr('stroke', '#333');
      });

      // adding text labels for each state 
      var textLabels = d3.select('svg')
      .selectAll('text')
      .data(nodes, function(d) {
         return d.name;
      }); 
      textLabels.enter().append("text").merge(textLabels)
      .attr("x", function(d){return d.x})
      .attr("y", function(d){return d.y})
      .attr("text-anchor", "middle")  
      .style("font-size", "10px")
      .text(function(d){return d.label});
  }


  // adding our legend 
  svg.append('g')
	.attr('class', 'legend')
	// put the legend to the left of the cartogram
	.attr('transform', 'translate(0, 300)');
	// our legend is based on colors, so we use a legendcolor
  // with a scale set by our color scale

  legend = d3.legendColor()
  // format the labels to match desired output 
  .labelFormat(d3.format(".2s"))
	.title('Total Population')
	.titleWidth(75)
  .scale(color);

  svg.select('.legend')
  .call(legend);
}

// adding our html button, by default it shows Median Income
// on click, calls update fxn 
d3.select('body').append('br');
d3.select('body').append('text').text("Toggle category: ");
var button = d3.select('body')
.append('button')
.text('Median Income')
.on('click', update);

// our tooltip, appends div element to body of html with css features
// to display the tooltip 
var tooltip = d3.select('body')
.append('div')
.style('position', 'absolute')
.style('visibility', 'hidden')
.style('color', 'white')
.style('padding', '8px')
.style('background-color', '#626D71')
.style('border-radius', '6px')
.style('text-align', 'center')
.style('font-family', 'monospace')
.text('');

// update function called on button click
function update() {
  // get the data already rendered in the DOM
  var selection = d3.select('svg').selectAll("circle").data();

  // set attributes based on whether we are showing income or population
  // arbitrarily chose range for radius to match desired output
  var whichData;
  if (showPop) { 
    whichData = medIncome;
    radius.range([23,27]);
    legend.title("Median Income")
  } else {
    whichData = population;
    radius.range([8,60]);
    legend.title("Total Population")
  }
  // set our scales to the desired data 
  var extent = d3.extent(whichData.values());
  radius.domain(extent);
  color.domain([0, extent[1]]);

  // reset the positions and value based on the desired data
  // x0 and y0 are the initial positions that never change, 
  // so I reset the x and y to them 
  selection.forEach(function(elem) {
    var value = whichData.get(elem.id);
    elem.x = elem.x0;
    elem.y = elem.y0;
    elem.value = value;
    elem.r = radius(value);
  });
  // redraw legend
  svg.select('.legend').call(legend);
  // restart simulation
  simulation.nodes(selection).alpha(1).restart();

  // switch boolean from previous value 
  showPop = !showPop;
  // edit button text based on boolean 
  if (!showPop) {
  button.text("Total Population");
} else {
  button.text("Median Income");
}
};