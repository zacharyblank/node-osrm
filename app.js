process.env.UV_THREADPOOL_SIZE = Math.ceil(require('os').cpus().length * 1.5);

var OSRM = require('osrm')
var ortools = require('node_or_tools')
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
	try {
		coordinates = parseCoordinates(req.params.coordinates)
	} catch (err) {
		return res.json({"error": err});
	}

	console.log("Input: ", coordinates.length)

	if (req.query.optimize === 'true') {
		osrm.table({
			coordinates: coordinates,
		}, function(err, result) {
			if (err) return res.json({"error":err.message});


			var dummyNodeEdges = []
			for (var i = 0; i < result.durations.length; i++) {
				if (i == result.durations.length - 1) {
					dummyNodeEdges.push(0)
				} else {
					// dummyNodeEdges.push(Number.MAX_VALUE)
					dummyNodeEdges.push(999999999)
				}

				result.durations[i].push(dummyNodeEdges[dummyNodeEdges.length-1])
			}

			dummyNodeEdges.push(0)
			dummyNodeEdges[0] = 0
			result.durations.push(dummyNodeEdges)

			console.log("Durration Length: ", result.durations.length)
			console.log("DUMMY: ", dummyNodeEdges)

			// console.log("RESULTS: ", result.durations)

			var TSP = new ortools.TSP({
				numNodes: result.durations.length,
				costs: result.durations
			});

			TSP.Solve({
				computeTimeLimit: 10000,
				depotNode: 0,
			}, function(err, solution) {
				var ordered = [coordinates[0]]

				console.log("Solution: ", solution.length, solution)

				for (var i = 0; i < solution.length; i++) {
					// skip the last dummy node!
					if (solution[i] < coordinates.length-1) {
						ordered.push(coordinates[solution[i]])
					}
				}

				ordered.push(coordinates[coordinates.length-1])

				// ordered.splice(-1,1)
				// solution.splice(-1,1)

				// console.log("Solution: ", solution.length)
				// console.log("Output: ", ordered.length)

				// console.log(ordered)

				// solution = solution.splice(1, solution.length-1).reverse()
				solution.unshift(0)
				solution.pop()
				// solution = solution.map(function(i) {
				// 	return i-1
				// })

				osrm.route({
					coordinates: ordered,
					overview: 'full',
					steps: true
				}, function(err, result) {
					if (err) return res.json({"error":err.message});
			        return res.json({
			        	waypoint_order: solution,
			        	routes: result.routes
			        });
				});
			})
		})
	} else {
		osrm.route({
			coordinates: coordinates,
			overview: 'full',
			steps: true
		}, function(err, result) {
			if (err) return res.json({"error":err.message});
	        return res.json({
	        	waypoints: result.waypoints,
	        	routes: result.routes
	        });
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