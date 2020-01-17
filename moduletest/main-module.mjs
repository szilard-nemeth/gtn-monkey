import * as MapUtils from './maputils.mjs';


let map = new Map()
map.set("a", 1)
map.set("b", 2)
var str = MapUtils.strMapToObj(map);
MapUtils.log(JSON.stringify(str));