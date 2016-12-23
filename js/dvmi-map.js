var SPREADSHEET_ID = '15d0Yznn2SrlpzDs_W26Tgxyq1oWZmBNpNINiBN2HUVs';

var svg,
    dvmi_data,
    topology,
    width      = 900,
    height     = 620,
    x_offset   = -20,
    projection = d3.geoConicConformalSpain(),
    path       = d3.geoPath();


var getTransform = function(d) {
  return 'translate('+d.x+','+d.y+')';
};

var getDvmiPopulation = function() {
  var total = 0;
  // Map from region codes to its provinces codes
  var regionsCodes = {
    '01': ['04','11','14','18','21','23','29','41'],
    '02': ['22','44','50'],
    '03': ['33'],
    '04': ['07'],
    '05': ['35','38'],
    '06': ['39'],
    '07': ['05','09','24','34','37','40','42','47','49'],
    '08': ['02','13','16','19','45'],
    '09': ['08','17','25','43'],
    '10': ['03','12','46'],
    '11': ['06','10'],
    '12': ['15','27','32','36'],
    '13': ['28'],
    '14': ['30'],
    '15': ['31'],
    '16': ['01','48','20'],
    '17': ['26']
  };
  var regions = dvmi_data
    .filter(function(d) { return d.id.length == 2; })
    .map(function(d) { return regionsCodes[d.id]; });
  dvmi_data.forEach(function(d) {
    var population = +d.population;
    // Don't sum population of municipalities from regions with dvmi implementation
    if(d.id.length === 5){
      regions.forEach(function(provinces) {
        if (provinces.indexOf(d.id.substring(0,2)) !== -1)
          population = 0;
      });
    }
    total += population;
  });
  return (total*0.000001).toLocaleString('es-ES', {maximumFractionDigits: 1});
};

var setupMap = function() {

  // Setup description
  d3.select('#dvmi-map').append('div')
    .attr('class', 'map-description')
    .html(getDvmiPopulation()+' millones de ciudadanos ya pueden consultar sus presupuestos locales o autonómicos de forma visual y fácilmente comprensible');

  // Setup SVG
  svg = d3.select('#dvmi-map').append('svg')
    .attr('class', 'map-svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
      .attr('transform', 'translate('+x_offset+',0)');

  // Filter DVMI data to skip implementations by other people (ej. Malaga or Vilanova)
  dvmi_data = dvmi_data.filter(function(d){ return d.by !== 'Otros'; });

  // Get a Codes array in order to draw current DVMI regions & municipalities
  dvmi_codes = dvmi_data.map(function(d){ return d.id; });

  // Setup dvmi data as an nested object usign code as key
  dvmi_data = d3.nest()
    .key(function(d) { return d.id; })
    .rollup(function(d) { return d[0]; })
    .object(dvmi_data);

  // Setup cartography projection & path function
  projection
    .scale(3500)
    .translate([width/2, (height/2)]);

  path.projection(projection);

  var radiusScale = d3.scaleQuantile()
    .domain([5000, 20000, 150000, 1000000])
    .range([3, 4, 5, 6]);

  var categoryScale = d3.scaleQuantile()
    .domain([5000, 20000, 150000, 1000000])
    .range([4, 3, 2, 1]);

  // Get municipalities geometry using TodoJSON & dvmi_municipalities array
  var municipalities_data = {
    geometries: topology.objects.municipalities.geometries.filter(function(d){ return dvmi_codes.indexOf(d.id) !== -1; }),
    type: 'GeometryCollection'
  };

  // Get municipalities nodes
  var municipalities_nodes = topojson.feature(topology, municipalities_data).features;
  municipalities_nodes.forEach(function(d){
    var centroid = path.centroid(d),
        dvmi_item = dvmi_data[d.id];
    d.x = centroid[0];
    d.y = centroid[1];
    d.r = radiusScale(dvmi_item.population);
    d.category = categoryScale(dvmi_item.population);
    d.alignment = dvmi_item.alignment;
    d.offset = (dvmi_item.label_offset) ? dvmi_item.label_offset.split(' ') : null;
    delete d.properties;
  });

  // Use a collision force layout to avoid overlap in municipalities circles
  var simulation = d3.forceSimulation(municipalities_nodes)
    .force('x', d3.forceX(function(d) { return d.x; }).strength(1))
    .force('y', d3.forceY(function(d) { return d.y; }).strength(1))
    .force('collide', d3.forceCollide().radius(function(d) { return d.r; }))
    .stop();
  for (var i = 0; i < 120; ++i) simulation.tick();

  // Setup Voronoi cells
  var voronoi = d3.voronoi()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .extent([[-1, -1], [width + 1, height + 1]]);

  var cells = svg.append('g')
    .attr('class', 'cell')
    .selectAll('path')
      .data(voronoi.polygons(municipalities_nodes))
      .enter().append('path')
        .attr('d', function(d) { return 'M' + d.join('L') + 'Z'; });

  // Add composition border for Canarias
  svg.append('path')
    .attr('class', 'composite-border')
    .attr('d', projection.getCompositionBorders());

  // Add autonomous_regions paths
  svg.selectAll('.regions')
    .data(topojson.feature(topology, topology.objects.autonomous_regions).features)
    .enter().append('path')
      .attr('id', function(d){ return 'region-'+d.id; })
      .attr('class', function(d){ return (dvmi_codes.indexOf(d.id) !== -1) ? 'regions active' : 'regions'; })
      .attr('d', path);

  // Add province paths
  svg.selectAll('.provinces')
    .data(topojson.feature(topology, topology.objects.provinces).features)
    .enter().append('path')
      .attr('id', function(d){ return 'province-'+d.id; })
      .attr('class', 'provinces')
      .attr('d', path);

  // Add autonomous_regions texts    
  svg.selectAll('.regions_labels')
    .data(topojson.feature(topology, topology.objects.autonomous_regions).features)
    .enter().append('text')
      .attr('class', 'labels regions_labels')
      .attr('transform', function(d) { return 'translate(' + path.centroid(d) + ')'; })
      .text(function(d){ return (dvmi_data[d.id]) ? dvmi_data[d.id].short_name : ''; });

  // Add municipalities paths & texts
  svg.selectAll('.municipalities')
    .data(municipalities_nodes)
    .enter().append('circle')
      .attr('id', function(d){ return 'municipality-'+d.id; })
      .attr('class', function(d) { return 'municipalities municipality-'+d.category; })
      .attr('transform', getTransform)
      .attr('r', function(d) { return d.r; });

  // Add labels using voronoi orientation
  // based on http://bl.ocks.org/mbostock/6909318
  svg.selectAll('.municipalities_labels')
    .data(voronoi.polygons(municipalities_nodes))
    .enter().append('text')
      .attr('class', function(d) {
        var centroid = d3.polygonCentroid(d),
            angle = Math.round(Math.atan2(centroid[1] - d.data.y, centroid[0] - d.data.x) / Math.PI * 2);
        d.orient = (angle === 0) ? 'right'
              : (angle === -1) ? 'top'
              : (angle === 1) ? 'bottom'
              : 'left';
        return 'labels municipalities_labels label-'+d.data.category+' label-align-'+d.orient;
      })
      .attr('transform', function(d) { return ( d.data.offset && d.data.offset.length === 2) ? 'translate(' + (d.data.x+parseInt(d.data.offset[0])) + ',' + (d.data.y+parseInt(d.data.offset[1])) + ')' : 'translate(' + d.data.x + ',' + d.data.y + ')'; })
      .attr('dominant-baseline', function(d) { return (d.orient === 'left' || d.orient === 'right') ? 'middle' : d.orient === 'top' ? 'text-after-edge' : 'text-before-edge'; })
      .attr('x', function(d) { return d.orient === 'right' ? d.data.r+3 : d.orient === 'left' ? -d.data.r-3 : null; })
      .attr('y', function(d) { return d.orient === 'bottom' ? d.data.r : d.orient === 'top' ? -d.data.r : null; })
      .text(function(d){ return (dvmi_data[d.data.id]) ? dvmi_data[d.data.id].short_name : ''; });

};

// Get data files & setup map
d3.queue()
  .defer(d3.csv, '/data/dvmi.csv')
  .defer(d3.json, '/es/municipalities.json')
  .await(function(error, _dvmi_data, _topology) {
    if (error) throw error;
    dvmi_data = _dvmi_data;
    topology  = _topology;
    setupMap();
  });