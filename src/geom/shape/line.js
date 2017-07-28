/**
 * @fileOverview line shapes
 * @author dxq613@gmail.com
 * @author sima.zhang1990@gmail.com
 * @author huangtonger@aliyun.com
 */

const Util = require('../../util');
const PathUtil = require('../util/path');
const ShapeUtil = require('../util/shape');
const Shape = require('./shape');
const Global = require('../../global');
const DOT_ARR = [ 2, 1 ];
const DASH_ARR = [ 10, 5 ];

function getAttrs(cfg) {
  const defaultCfg = Global.shape.line;
  const shapeCfg = Util.merge({}, defaultCfg, {
    stroke: cfg.color,
    lineWidth: cfg.size,
    strokeOpacity: cfg.opacity,
    opacity: cfg.opacity
  }, cfg.style);
  return shapeCfg;
}

// 获取带有上下区间的 path
function getRangePath(points, smooth, isInCircle) {
  const topPoints = [];
  const bottomPoints = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const tmp = ShapeUtil.splitPoints(point);
    bottomPoints.push(tmp[0]);
    topPoints.push(tmp[1]);
  }
  const topPath = getSinglePath(topPoints, smooth, isInCircle);
  const bottomPath = getSinglePath(bottomPoints, smooth, isInCircle);
  return topPath.concat(bottomPath);
}

// 单条 path
function getSinglePath(points, smooth, isInCircle) {
  let path;
  if (!smooth) {
    path = PathUtil.getLinePath(points, false);
  } else {
    path = PathUtil.getSplinePath(points, false);
  }
  if (isInCircle) {
    path.push([ 'Z' ]);
  }
  return path;
}
// get line path
function getPath(cfg, smooth) {
  let path;
  const points = cfg.points;
  const isInCircle = cfg.isInCircle;
  const first = points[0];
  if (Util.isArray(first.y)) {
    path = getRangePath(points, smooth, isInCircle);
  } else {
    path = getSinglePath(points, smooth, isInCircle);
  }
  return path;
}

function _interpPoints(points, fn) {
  let tmpPoints = [];
  Util.each(points, function(point, index) {
    const nextPoint = points[index + 1];
    tmpPoints.push(point);
    if (nextPoint) {
      tmpPoints = tmpPoints.concat(fn(point, nextPoint));
    }
  });
  return tmpPoints;
}
// 插值的图形path，不考虑null
function _getInterPath(points) {
  const path = [];
  Util.each(points, function(point, index) {
    const subPath = index === 0 ? [ 'M', point.x, point.y ] : [ 'L', point.x, point.y ];
    path.push(subPath);
  });
  return path;
}
// 插值的图形
function _getInterPointShapeCfg(cfg, fn) {
  const points = _interpPoints(cfg.points, fn);
  return _getInterPath(points);
}

function _markerFn(x, y, r, ctx) {
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
}

function _smoothMarkerFn(x, y, r, ctx) {
  ctx.moveTo(x - r, y);
  ctx.arcTo(x - r / 2, y - r / 2, x, y, r);
  ctx.arcTo(x + r / 2, y + r / 2, x + r, y, r);
}
// get marker cfg
function _getMarkerCfg(cfg, smooth) {
  return Util.mix({
    symbol: smooth ? _smoothMarkerFn : _markerFn,
    radius: 5
  }, getAttrs(cfg));
}

function _getInterMarkerCfg(cfg, fn) {
  return Util.mix({
    symbol: fn,
    radius: 5
  }, getAttrs(cfg));
}

// 当只有一个数据时绘制点
function drawPointShape(shapeObj, cfg, container) {
  const point = cfg.points[0];
  return container.addShape('circle', {
    attrs: Util.mix({
      x: point.x,
      y: point.y,
      r: 2,
      fill: cfg.color
    }, cfg.style)
  });
}

// regist line geom
const Line = Shape.registerFactory('line', {
  // 默认的shape
  defaultShapeType: 'line',
  getMarkerCfg(type, cfg) {
    const lineObj = Line[type] || Line.line;
    return lineObj.getMarkerCfg(cfg);
  },
  getActiveCfg(type, cfg) {
    const lineWidth = cfg.lineWidth || 0;
    return {
      lineWidth: lineWidth + 1
    };
  },
  // 计算点 如果存在多个点，分割成单个的点, 不考虑多个x对应一个y的情况
  getDefaultPoints(pointInfo) {
    return ShapeUtil.splitPoints(pointInfo);
  },
  drawShape(type, cfg, container) {
    const shape = this.getShape(type);
    let gShape;
    if (cfg.points.length === 1 && Global.showSinglePoint) {
      gShape = drawPointShape(this, cfg, container);
    } else {
      gShape = shape.draw(cfg, container);
    }
    if (gShape) {
      gShape.set('origin', cfg.origin);
      gShape.set('geom', Util.lowerFirst(this.className));
    }
    return gShape;
  }
});

// draw line shape
Shape.registerShape('line', 'line', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = getPath(cfg, false);
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path
      })
    });
  },
  getMarkerCfg(cfg) {
    return _getMarkerCfg(cfg);
  }
});

// 点线
Shape.registerShape('line', 'dot', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = getPath(cfg, false);
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path,
        lineDash: DOT_ARR
      })
    });
  },
  getMarkerCfg(cfg) {
    const tmp = _getMarkerCfg(cfg, false);
    tmp.lineDash = DOT_ARR;
    return tmp;
  }
});

// 断线 - - - -
Shape.registerShape('line', 'dash', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = getPath(cfg, false);
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path,
        lineDash: DASH_ARR
      })
    });
  },
  getMarkerCfg(cfg) {
    const tmp = _getMarkerCfg(cfg, false);
    tmp.lineDash = DASH_ARR;
    return tmp;
  }
});

// draw smooth line shape
Shape.registerShape('line', 'smooth', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = getPath(cfg, true);
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path
      })
    });
  },
  getMarkerCfg(cfg) {
    return _getMarkerCfg(cfg, true);
  }
});

Shape.registerShape('line', 'hv', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = _getInterPointShapeCfg(cfg, function(point, nextPoint) {
      const tmp = [];
      tmp.push({
        x: nextPoint.x,
        y: point.y
      });
      return tmp;
    });
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path
      })
    });
  },
  getMarkerCfg(cfg) {
    return _getInterMarkerCfg(cfg, function(x, y, r, ctx) {
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x, y - r);
      ctx.lineTo(x, y);
      ctx.lineTo(x + r, y);
    });
  }
});

Shape.registerShape('line', 'vh', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = _getInterPointShapeCfg(cfg, function(point, nextPoint) {
      const tmp = [];
      tmp.push({
        x: point.x,
        y: nextPoint.y
      });
      return tmp;
    });
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path
      })
    });
  },
  getMarkerCfg(cfg) {
    return _getInterMarkerCfg(cfg, function(x, y, r, ctx) {
      ctx.moveTo(x - r, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - r);
      ctx.lineTo(x + r, y - r);
    });
  }
});

Shape.registerShape('line', 'hvh', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = _getInterPointShapeCfg(cfg, function(point, nextPoint) {
      const tmp = [];
      const middlex = (nextPoint.x - point.x) / 2 + point.x;
      tmp.push({
        x: middlex,
        y: point.y
      });
      tmp.push({
        x: middlex,
        y: nextPoint.y
      });
      return tmp;
    });
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path
      })
    });
  },
  getMarkerCfg(cfg) {
    return _getInterMarkerCfg(cfg, function(x, y, r, ctx) {
      ctx.moveTo(x - r * 3 / 2, y);
      ctx.lineTo(x - r / 2, y);
      ctx.lineTo(x - r / 2, y - r / 2);
      ctx.lineTo(x + r / 2, y - r / 2);
      ctx.lineTo(x + r / 2, y);
      ctx.lineTo(x + r * 3 / 2, y);
    });
  }
});

Shape.registerShape('line', 'vhv', {
  draw(cfg, container) {
    const attrs = getAttrs(cfg);
    const path = _getInterPointShapeCfg(cfg, function(point, nextPoint) {
      const tmp = [];
      const middley = (nextPoint.y - point.y) / 2 + point.y;
      tmp.push({
        x: point.x,
        y: middley
      });
      tmp.push({
        x: nextPoint.x,
        y: middley
      });
      return tmp;
    });
    return container.addShape('path', {
      attrs: Util.mix(attrs, {
        path
      })
    });
  },
  getMarkerCfg(cfg) {
    return _getInterMarkerCfg(cfg, function(x, y, r, ctx) {
      ctx.moveTo(x - r, y);
      ctx.lineTo(x - r, y - r / 2);
      ctx.lineTo(x, y - r / 2);
      ctx.lineTo(x, y - r);
      ctx.lineTo(x, y + r / 2);
      ctx.lineTo(x + r, y + r / 2);
    });
  }
});

Line.spline = Line.smooth;

module.exports = Line;
