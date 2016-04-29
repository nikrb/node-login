var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var players;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected.");
    
    players = db.collection( 'players');
    // db.close();
});

exports.findAll = function( req, res){
    console.log( "player.FindAll for owner:", req.session.user._id);
    players.find( {"owner" : req.session.user._id}).toArray( function(err, items){
        if( err){
            console.log( "fetch players failed:", err);
            res.status(400).send( err);
        } else {
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "player.saveAll for owner:", user_id);
    var player_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    players.deleteMany( { owner : user_id}, null, function( err, results){
        if( err){
            console.log( "Player.saveAll delete failed:", err);
            res.status(400).send( err);
        } else {
            players.insertMany( player_list, function( err, objs){
                if( err){
                    console.log( "player.saveAll insert failed:", err);
                    res.status(400).send( err);
                } else {
                    res.status(200).send( objs.ops);
                }
            });
        }
    });
    
};
