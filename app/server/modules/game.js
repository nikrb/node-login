var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var games;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected.");
    
    games = db.collection( 'games');
    // db.close();
});

exports.findAll = function( req, res){
    games.find( {"owner":req.session.user._id}).sort( { date : 0}).toArray( function(err, items){
        if( err){
            console.log( "fetch games failed");
            res.status(400).send( err);
        } else {
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "Game.saveAll owner:", user_id);
    var game_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    games.insertMany( game_list, [], function( err, objs){
        if( err){
            console.log( "Game.saveAll error:", err);
            res.status(400).send( err);
        } else {
            res.status(200).send( objs.ops);
        }
    });
};
