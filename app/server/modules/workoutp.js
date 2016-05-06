
exports.findWorkoutByMidWithDrills = function( wmid, owner){
    return new Promise( function( resolve, reject){
        workouts.find( { _id : ObjectId( wmid)})
        .toArray( function( err, workout_one){
            if( err){
                reject( err);
            } else {
                var workout = workout_one[0];
                var workout_drills = workout.hasDrills.split(",")
                .map( function( id){
                    console.log( "drill id:", id);
                    return ObjectId( id);
                });
                var owners = [ "system", owner];
                console.log( "finding drill list:", workout_drills);
                console.log( "owner list:", owners);
                drills.find( {_id : { $in : workout_drills} , owner: { $nin : owners} } )
                .toArray( function( err, unowned_drills){
                    if( err){
                        console.log( "@@routine.findWorkoutByMidWithDrills failed:", err);
                    } else {
                        workout.drill_list = unowned_drills;
                    }
                    console.log( "resolve with workout:", workout);
                    resolve( workout);
                });
            }
        });
    });
};