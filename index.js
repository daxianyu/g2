const G = require('@ali/g');
const Monitor = require('@ali/g2-monitor');
const Animate = require('./src/animate/animate');
const Chart = require('./src/chart/chart');
const Global = require('./src/global');
const Scale = require('./src/scale/index');
const Shape = require('./src/geom/shape/');
const Util = require('./src/util');

const G2 = {
  // version
  version: Global.version,
  // visual encoding
  Animate,
  Chart,
  Global,
  Scale,
  Shape,
  Util,
  // render engine
  G,
  DomUtil: G.DomUtil,
  MatrixUtil: G.MatrixUtil,
  PathUtil: G.PathUtil
};

Monitor.tracking = true;
G2.track = function(enable) {
  Monitor.tracking = enable;
};
require('./src/track');

// 保证两个版本共存
if (typeof window !== 'undefined') {
  if (window.G2) {
    console.warn(`There are multiple versions of G2. Version ${G2.version}'s reference is 'window.G2_3'`);
  } else {
    window.G2 = G2;
  }
}

module.exports = G2;
