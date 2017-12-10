// set width and height of main svg element 
var width = 1000,
    height = 1000;

// adding svg element to body of html 
var svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

//colorscale for data points 
var color = d3.scaleLinear()
  .interpolate(d3.interpolateHcl)
  .range(['#007AFF', '#FEB24C']);

// the map projection we are using
var projection = d3.geoAlbersUsa();

// data structures for the data we are showing in our cartogram
var population = d3.map();
var medIncome = d3.map();

// scale for the radius of our circles (the circles represent the data- either population or median income by state) 
var radius = d3.scaleSqrt().range([8,55]);

// our simulation (add more here) 
//we put this in the global scope so we can access it later (in our update function??)
var simulation;

// use d3-queue to avoid callback hell, and manage how we are loading our datasets asynchronously and ensure the data finishes loading before we call main
d3.queue()
  .defer(d3.json, 'data/us-states-centroids.json')
  .defer(d3.csv, 'data/acs_pop_income.csv', function(d)  {
    // format our data so all the id's are 2 digits 
    if (d.id.length < 2) d.id = '0' + d.id;
    //populate our data structures with properly formatted and relevant data (coerced as integers)
    population.set(d.id, +d.toal_pop);
    medIncome.set(d.id, +d.median_income);
  })
  // await means not to call main until the previous two defers finish
  .await(main);

// our main callback 
function main(error, geojson) {
  if (error) throw error;

  // min and max values of our dataset 
  var extent = d3.extent(geojson.features, function(d) {
    return d.properties.population;
  });

  //set the domain of the radius scale to the extent 
  radius.domain(extent);

  //refactoring the original data into the structure that we want to create our cartogram 
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

  // simulation (add more)
  simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(1))
  .force('collision', d3.forceCollide().strength(1)
    .radius(function(d) {
    return d.r;
    }))
  .on('tick', ticked);
  
  // (add )
  function ticked() {
    //draw our circles
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
        return color(d.r);
      })
      .attr('stroke', '#333')
      // when mouseover event on circle occurs, show the tooltip 
      .on('mouseover', function(d) {
        // localetostring -> adds commas to value
        tooltip.html(d.name + "<br>" + "$" + d.value.toLocaleString());
        tooltip.style('visibility', 'visible');
        d3.select(this).attr('stroke', 'green');
      })
      .on('mousemove', function() {
        tooltip.style('top', (d3.event.pageY - 10) + 'px')
          .style('left', (d3.event.pageX + 10) + 'px');
          //padding so the cursor doesnt overlap
      })
      //when mouseout event occurs, hide the tooltip
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        d3.select(this).attr('stroke', '#333');
      });
  }

}

// our tooltip, appends div element to body of html with css features to display the tooltip 
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