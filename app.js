process.env.UV_THREADPOOL_SIZE = Math.ceil(require('os').cpus().length * 1.5);

var OSRM = require('osrm')
var express = require('express')

var env = require('./.env.js')
var osrm = new OSRM({
	path: env.network,
	algorithm: env.algorithm
})
var app = express();

function parseCoordinates(coordinates) {
	return coordinates.split(';').map(coordinates => {
		var coordinates = coordinates.split(",")

		var lon = parseFloat(coordinates[0])
		var lat = parseFloat(coordinates[1])

		if (isNaN(lon) || isNaN(lat)) {
			throw "Lat/Lon pairs must be numbers"
		}

		return [lon, lat]
	})
}

app.get('/route/:coordinates', function(req, res) {

	console.log("optimize: ", req.query.optimize)

	try {
		coordinates = parseCoordinates(req.params.coordinates)
	} catch (err) {
		return res.json({"error": err});
	}

	if (req.query.optimize) {
		osrm.trip({
			coordinates: coordinates,
			roundtrip: false,
			source: 'first',
			destination: 'last',
			steps: true
		}, function(err, result) {
			if (err) return res.json({"error":err.message});
	        return res.json(result);
		});
	} else {
		osrm.route({
			coordinates: coordinates,
			steps: true
		}, function(err, result) {
			if (err) return res.json({"error":err.message});
	        return res.json(result);
		});
	}
})

app.get('/table/:coordinates', function(req, res) {

	try {
		coordinates = parseCoordinates(req.params.coordinates)
	} catch (err) {
		return res.json({"error": err});
	}

	osrm.table({
		coordinates: coordinates,
	}, function(err, result) {
		if (err) return res.json({"error":err.message});
        return res.json(result);
	});
})

// ;-122.683932,45.521350;-122.659471,45.520268;-122.675349,45.515817;-122.644193,45.529168;-122.695777,45.530370;-122.645738,45.506976;-122.707107,45.528747;-122.657067,45.536168;-122.695777,45.517167

app.get('/trip/:coordinates', function(req, res) {

	try {
		coordinates = parseCoordinates(req.params.coordinates)
	} catch (err) {
		return res.json({"error": err});
	}

	console.log("total coordinates: ", coordinates.length)

	osrm.trip({
		coordinates: coordinates,
		roundtrip: false,
		source: 'first',
		destination: 'last',
		steps: true
	}, function(err, result) {
		if (err) return res.json({"error":err.message});
        return res.json(result);
	});
})

console.log('Listening on port: ' + env.port);
app.listen(env.port);