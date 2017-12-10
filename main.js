var width = 1000,
    height = 1000;

var svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

var color = d3.scaleLinear()
  .interpolate(d3.interpolateHcl)
  .range(['#007AFF', '#FEB24C']);

var projection = d3.geoAlbersUsa();

var population = d3.map();
var medIncome = d3.map();

var radius = d3.scaleSqrt().range([2,50]);

var simulation;

d3.queue()
  .defer(d3.json, 'data/us-states-centroids.json')
  .defer(d3.csv, 'data/acs_pop_income.csv', function(d)  {
    if (d.id.length < 2) d.id = '0' + d.id;
    population.set(d.id, +d.toal_pop);
    medIncome.set(d.id, +d.median_income);
  })
  .await(main);

function main(error, geojson, country_data) {
  if (error) throw error;

  radius.domain([0, d3.max(geojson.features, function(d) { return d.properties.population; })]);

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

  console.log(nodes);

  simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(1))
  .force('collision', d3.forceCollide().strength(1)
    .radius(function(d) {
    return d.r;
    }))
  .on('tick', ticked);

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
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        d3.select(this).attr('stroke', '#333');
      });
  }

}

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