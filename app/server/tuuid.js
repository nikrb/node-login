
function b(a){
    return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b);
}

var arr = [];

for( var i =0; i < 10; i++){
    arr.push( b());
}

arr.sort();

for( i=1; i<arr.length; i++){
    if( arr[i] == arr[i-1]) {
        console.log( "ndx [%d] has a duplciate", i);
    }
}

console.log( "finished");