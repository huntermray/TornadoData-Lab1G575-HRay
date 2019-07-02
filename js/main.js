/* Map of GeoJSON data from MegaCities.geojson */

//function to instantiate the Leaflet map
function createMap(){
    
    // imports/displays tile layer package specified by URL
    var Stamen_TerrainBackground = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}{r}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 18,
	ext: 'png'
    });
    
    //defines map bounds
    var southWest = L.latLng(18.731, -139.222),
    northEast = L.latLng(52.488, -51.069),
    mybounds = L.latLngBounds(southWest, northEast);
    
    //create the map with options
    var map = L.map('map', {
        layers: [Stamen_TerrainBackground],
        center: [38.2, -96.0],
        zoom: 4,
        maxBounds: mybounds,
        minZoom: 3.5,
        maxZoom: 7,
        zoomControl: false
    });
    var zoomHome = L.Control.zoomHome({position: 'topleft'});
    zoomHome.addTo(map);
    
    var statesStyle = {
        "color": "#b1b1b1",
        "weight": 1,
        "opacity": 0.95 
    }
    var statesLayer = L.geoJSON(stateOutlines,{
        style: statesStyle
    });
    map.fitBounds(statesLayer.getBounds());
    
    //Import Point GeoJSON data
    $.ajax("data/MayTornadoesPoints.geojson", {
        dataType: "json",
        success: function(response){
            //create an attribute array
            var attributes = processData(response);
            console.log(attributes);
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            console.log("Point Layer added to map!");
        }
    });
    
    var baseMaps = {
        "Terrain": Stamen_TerrainBackground   
    };
    var overlayMaps = {
        "Search Layer": statesLayer   
    };
    
    L.control.layers(baseMaps,overlayMaps).addTo(map);
    
    console.log("'createMap' function completed!");
    
    var searchControl = new L.Control.Search({
    layer: statesLayer,
    propertyName: 'STATE_NAME',
    marker: false,
    moveToLocation: function(latlng, title, map) {
        //map.fitBounds( latlng.layer.getBounds() );
        var zoom = map.getBoundsZoom(latlng.layer.getBounds());
        map.setView(latlng, zoom); // access the zoom
    }
});

searchControl.on('search:locationfound', function(e) {

    //console.log('search:locationfound', );

    //map.removeLayer(this._markerSearch)

    e.layer.setStyle({fillColor: '#3f0', color: '#0f0'});
    if(e.layer._popup)
        e.layer.openPopup();

}).on('search:collapsed', function(e) {

    statesLayer.eachLayer(function(layer) {	//restore feature color
        statesLayer.resetStyle(layer);
    });	
});

map.addControl( searchControl );  //inizialize search control
};

//function to attach popups to each mapped feature
function pointsOnEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties){
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }; 
    };
    layer.bindPopup(popupContent);
};

function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 20;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    return radius;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#ed5c10",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var popupContent = "<p><b>State:</b> " + feature.properties.STATE_NAME + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Tornadoes in May " + year + ":</b>" + feature.properties[attribute];

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius)
    });
    
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//build attribute arrays
function processData(response) {
	var attributes = [];
	i = 0;
	var values = response.features[i].properties;
	for (var item in values) {
		if (item.indexOf("YR") > -1) {
			attributes.push(item);
		}
	}
    console.log(attributes);
	return attributes;
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>State:</b> " + props.STATE_NAME + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split("_")[1];
            popupContent += "<p><b>Tornadoes in May </b>" + year + "<b>:<b/>" + "&nbsp"+ props[attribute] + "</p>";

            //replace the layer popup
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-radius)
            });
            
            updateYear();
        };
    });
};

//Create new sequence controls
function createSequenceControls(map,attributes){
    //create range input element (slider)
    $('#slider').append('<input class="range-slider" type="range">');
    //set slider attributes
    //$('#slider').append('<button class="skip" id="reverse"></button>');
    //$('#slider').append('<button class="skip" id="forward"></button>');
    $('#reverse').append('<button class="skip" id="reverse"><img src="img/tornado-left.png" width=40 height=25></button>');
    $('#forward').append('<button class="skip" id="forward"><img src="img/tornado-right.png" width=40 height=25></button>');
    
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });

    //create slider event handler
    $('.range-slider').on('input', function(){
        //get the new index value
        var index = $(this).val();
        updatePropSymbols(map, attributes[index]);
        updateYear(index);
    });
    
    //create button event handler
	$('.skip').click(function () {
		var index = $('.range-slider').val();
		if ($(this).attr('id') == 'forward') {
			index++;
			index = index > 6 ? 0 : index;
		} else if ($(this).attr('id') == 'reverse') {
			index--;

			index = index < 0 ? 6 : index;
		}

		$('.range-slider').val(index);
		updatePropSymbols(map, attributes[index]);
        updateYear(index);
    });   
};

//Update year display to match selection
function updateYear(index) {
	if (index == 0) {
		$('#year').html("<h4>2013</h4");
	} else if (index == 1) {
		$('#year').html("<h4>2014</h4");
	} else if (index == 2) {
		$('#year').html("<h4>2015</h4");
	} else if (index == 3) {
		$('#year').html("<h4>2016</h4");
	} else if (index == 4) {
		$('#year').html("<h4>2017</h4");
	} else if (index == 5) {
		$('#year').html("<h4>2018</h4");
	} else if (index == 6) {
		$('#year').html("<h4>2019</h4");
    }
};



/*function addPolygonData(){
    // Import Polygon GeoJSON data
    $.getJSON("data/MayTornadoesPolygons.geojson",function(stateData){
        L.geoJson(stateData, {
            style: function(feature){
            var fillColor;
            var density = feature.properties.NUM_TOTAL;
              if ( density > 80 ) fillColor = "#a50f15";
              else if ( density > 40 ) fillColor = "#de2d26";
              else if ( density > 20 ) fillColor = "#fb6a4a";
              else if ( density > 10 ) fillColor = "#fcae91";
              else if ( density > 0 ) fillColor = "#fee5d9";
              else fillColor = "#f7f7f7";  // no data
              return { color: "#999", weight: 1, fillColor: fillColor, fillOpacity: .6 };
            },
            onEachFeature: function( feature, layer ){
                layer.bindPopup( "<strong>" + feature.properties.STATE_NAME + "</strong><br/>" + feature.properties.NUM_TOTAL + " tornado event(s) during May 2013-2019" )
            }
        }).addTo(map);
    });
};*/

$(document).ready(createMap);