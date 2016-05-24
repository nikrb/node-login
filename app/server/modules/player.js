var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');

var players;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("Player Connected.");
    
    players = db.collection( 'players');
});

exports.findAll = function( req, res){
    logger.trace( "@player.FindAll for user:", req.session.user._id);
    players.find( {"owner" : req.session.user._id}).toArray( function(err, items){
        if( err){
            logger.warn( "@player.findAll fetch players failed:", err);
            res.status(400).send( err);
        } else {
            logger.info( "@player.findAll results:", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    logger.trace( "@player.saveAll for owner:", user_id);
    var promises = [];
    req.body.forEach( function( player){
        var p = new Promise( function( resolve, reject){
            if( typeof player.mid === "undefined"){
                player.owner = user_id;
                players.insertOne( player).then( function( result){
                    if( result.result.ok){
                        resolve( { ios_id : player.ios_id, _id : result.ops[0]._id });
                    } else {
                        logger.error( "@player.saveAll insertOne failed for:", player);
                        resolve( 0);
                    }
                });
            } else {
                players.update( {_id: ObjectId( player.mid)},
                            { $set : { name : player.name, 
                                        email : player.email,
                                        shirt_number : player.shirt_number,
                                        owner : user_id
                            }})
                .then( function( result){
                    resolve( { ios_id : player.ios_id, _id : player.mid });
                });
            }
        });
        promises.push( p);
    });
    Promise.all( promises).then( function( results){
        logger.trace( "@player.saveAll results:", results);
        var keep_mids = results.map( function( obj){
            return ObjectId( obj._id);
        });
        players.deleteMany( { owner : user_id, _id : { $nin : keep_mids}})
        .then( function( result){
            if( result.result.n > 0){
                logger.info( "@player.saveAll user [%s] deleted player count[%d]", user_id, result.result.n);
            }
        });
        logger.info( "@player.saveAll result:", results);
        res.send( results);
    });
};
