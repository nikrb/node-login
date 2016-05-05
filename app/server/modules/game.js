var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var games;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Game Connected.");
    
    games = db.collection( 'games');
});

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "@game.findAll user:", user_id);
    games.find( {"owner": user_id}).toArray( function(err, items){
        if( err){
            console.log( "@Game.findAll failed:", err);
            res.status(400).send( err);
        } else {
            console.log( "@Game.findAll results", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "@Game.saveAll owner:", user_id);
    var game_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new games
    games.insertMany( game_list, [], function( err, objs){
        if( err){
            console.log( "@Game.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            console.log( "@Game.saveAll results:", results);
            res.status(200).send( results);
        }
    });
};
