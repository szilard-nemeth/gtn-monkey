//TODO move this to separate module
//https://2ality.com/2015/08/es6-map-json.html
//https://stackoverflow.com/questions/50153172/how-to-serialize-a-map-in-javascript
function strMapToObj(strMap) {
  let obj = Object.create(null);
  for (let [k,v] of strMap) {
    // We don’t escape the key '__proto__'
    // which can cause problems on older engines
    obj[k] = v;
  }
  return obj;
}

function objToStrMap(obj) {
	var entries = Object.entries(obj)
	if (entries.length > 0) {
		return new Map(entries)
	} else {
		return new Map()
	}
  // return new Map(Object.entries(obj));
  //Alternatively:
  // let strMap = new Map();
  // for (let k of Object.keys(obj)) {
  //   strMap.set(k, obj[k]);
  // }
  // return strMap;
}

function log(str) {
  console.log("LOADED maputils: " + str)
}

export { strMapToObj, objToStrMap, log };