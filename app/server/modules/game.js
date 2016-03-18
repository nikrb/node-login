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
    games.find().sort( { date : 0}).toArray( function(err, items){
        if( err){
            console.log( "fetch drills failed");
        } else {
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    var game_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    games.insertMany( game_list).then( function( objs){
        res.send( objs.ops);
    });
};
