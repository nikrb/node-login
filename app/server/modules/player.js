var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var players;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Player Connected.");
    
    players = db.collection( 'players');
});

exports.findAll = function( req, res){
    console.log( "@player.FindAll for user:", req.session.user._id);
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
    console.log( "@player.saveAll for owner:", user_id);
    var promises = [];
    req.body.forEach( function( player){
        var p = new Promise( function( resolve, reject){
            players.update( {_id: ObjectId( player.mid)},
                        { $set : { name : player.name, 
                                    email : player.email,
                                    shirt_number : player.shirt_number,
                                    owner : user_id
                        }},
                        { upsert : true}).then( function( result){
                var ret = { ios_id : player.ios_id };
                if( result.upsertedCount > 0){
                    ret._id = result.upsertedId;
                } else {
                    ret._id = player.mid;
                }
                resolve( ret);
            });
        });
        promises.push( p);
    });
    Promise.all( promises).then( function( results){
        console.log( "@player.saveAll results:", results);
        res.send( results);
    });
};
