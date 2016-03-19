var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var shots;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected.");
    
    shots = db.collection( 'shots');
    // db.close();
});

exports.findAll = function( req, res){
    shots.find( {"owner":req.session.user._id, "game" : req.body.inGame}).
            sort( { quarter : 0}).toArray( function(err, items){
        if( err){
            console.log( "fetch shots failed");
            res.status(400).send( err);
        } else {
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "Shots.saveAll owner:", user_id);
    var shot_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    shots.insertMany( shot_list, [], function( err, results){
        if( err){
            console.log( "Shots.saveAll error:", err);
            res.status(400).send( err);
        } else {
            res.send( results.ops);
        }
    });
};
