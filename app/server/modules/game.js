var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var games;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("Game Connected.");
    
    games = db.collection( 'games');
});

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@game.findAll user:", user_id);
    games.find( {"owner": user_id}).toArray( function(err, items){
        if( err){
            logger.error( "@Game.findAll failed:", err);
            res.status(400).send( err);
        } else {
            logger.info( "@Game.findAll results", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@Game.saveAll owner:", user_id);
    var game_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new games
    games.insertMany( game_list, [], function( err, objs){
        if( err){
            logger.error( "@Game.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            logger.info( "@Game.saveAll results:", results);
            res.status(200).send( results);
        }
    });
};

exports.purge = function( game_mid_list){
    var mids = game_mid_list.map( function( ele){
        return ObjectId( ele);
    });
    games.deleteMany( { _id : { $in : mids}}, {}, function( err, results){
        if( err){
            logger.error( "@game.purge failed:", err);
        } else {
            logger.info( "@game.purge count:", results.deletedCount);
        }
    });
};
