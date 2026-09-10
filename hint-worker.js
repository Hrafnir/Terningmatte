import {findHint} from './hints.js';
self.onmessage=({data})=>self.postMessage({expression:findHint(data.dice,data.target,data.level)});
