const Util = require('../../util');
const { Axis } = require('../../component/index');
const { vec2 } = require('@ali/g').MatrixUtil;
const Global = require('../../global');
const HIDE_DIMS = [ '..x', '..y', '..long', '..lant', '..pieX' ]; // TODO: 常量可以统一放在某个地方

function formatTicks(ticks) {
  let tmp = [];
  if (ticks.length > 0) {
    tmp = ticks.slice(0);
    const first = tmp[0];
    const last = tmp[tmp.length - 1];
    if (first.value !== 0) {
      tmp.unshift({
        value: 0
      });
    }
    if (last.value !== 1) {
      tmp.push({
        value: 1
      });
    }
  }
  return tmp;
}

class AxisController {
  constructor(cfg) {
    this.visible = true;
    this.container = null;
    this.coord = null;
    this.options = null;
    Util.mix(this, cfg);
  }

  _isHide(field) { // 对应的坐标轴是否隐藏
    const options = this.options;
    if (Util.inArray(HIDE_DIMS, field) && Util.isNil(options[field])) {
      return true; // 默认不展示带 .. 的 dim
    }

    if (options && options[field] === false) {
      return true;
    }
    return false;
  }

  _getMiddleValue(curValue, ticks, index) {
    const tickCount = ticks.length;
    if (index === tickCount - 1) {
      return null;
    }
    const nextValue = ticks[index + 1].value;
    return (curValue + nextValue) / 2;
  }

  _getLineRange(coord, scale, dimType, index) {
    let start;
    let end;
    let isVertical;
    const field = scale.field;
    const options = this.options;
    let position = '';
    if (options[field] && options[field].position) {
      position = options[field].position;
    }

    if (dimType === 'x') { // x轴的坐标轴,底部的横坐标
      start = {
        x: 0,
        y: position === 'top' ? 1 : 0
      };
      end = {
        x: 1,
        y: position === 'top' ? 1 : 0
      };
      isVertical = false;
    } else { // y轴坐标轴
      if (index) { // 多轴的情况
        start = {
          x: position === 'left' ? 0 : 1,
          y: 0
        };
        end = {
          x: position === 'left' ? 0 : 1,
          y: 1
        };
      } else { // 单个y轴，或者第一个y轴
        start = {
          x: position === 'right' ? 1 : 0,
          y: 0
        };
        end = {
          x: position === 'right' ? 1 : 0,
          y: 1
        };
      }
      isVertical = true;
    }

    start = coord.convert(start);
    end = coord.convert(end);

    return {
      start,
      end,
      isVertical
    };
  }

  _getLineCfg(coord, scale, dimType, index) {
    let factor;
    const range = this._getLineRange(coord, scale, dimType, index);
    let isVertical = range.isVertical; // 标识该坐标轴是否是纵坐标
    const start = range.start;
    const end = range.end;
    const center = coord.center;

    if (coord.isTransposed) {
      isVertical = !isVertical;
    }

    if ((isVertical && (start.x > center.x)) || (!isVertical && (start.y > center.y))) {
      factor = 1;
    } else {
      factor = -1;
    }

    return {
      isVertical,
      factor,
      start,
      end
    };
  }

  // 获取圆弧坐标轴配置项信息
  _getCircleCfg(coord) {
    const circleCfg = {};
    const rangeX = coord.x;
    const rangeY = coord.y;
    const isReflectY = rangeY.start > rangeY.end;
    let start;
    if (coord.isTransposed) {
      start = {
        x: isReflectY ? 0 : 1,
        y: 0
      };
    } else {
      start = {
        x: 0,
        y: isReflectY ? 0 : 1
      };
    }

    start = coord.convert(start);
    const center = coord.circleCentre;
    const startVector = [ start.x - center.x, start.y - center.y ];
    const normalVector = [ 1, 0 ];
    let startAngle;
    if (start.y > center.y) {
      startAngle = vec2.angle(startVector, normalVector);
    } else {
      startAngle = vec2.angle(startVector, normalVector) * -1;
    }
    const endAngle = startAngle + (rangeX.end - rangeX.start);

    circleCfg.startAngle = startAngle;
    circleCfg.endAngle = endAngle;
    circleCfg.center = center;
    circleCfg.radius = Math.sqrt(Math.pow(start.x - center.x, 2) + Math.pow(start.y - center.y, 2));
    circleCfg.innerRadius = coord.innerRadius || 0;
    return circleCfg;
  }

  _getRadiusCfg(coord) {
    const startAngle = coord.x.start;
    const factor = startAngle < 0 ? -1 : 1;
    let start;
    let end;
    if (coord.isTransposed) {
      start = {
        x: 0,
        y: 0
      };
      end = {
        x: 1,
        y: 0
      };
    } else {
      start = {
        x: 0,
        y: 0
      };
      end = {
        x: 0,
        y: 1
      };
    }
    return {
      factor,
      start: coord.convert(start),
      end: coord.convert(end)
    };
  }

  _getPolyLineCfg(coord, scale, dimType) {
    const ticks = scale.getTicks();
    const tickPoints = [];
    const range = this._getLineRange(coord, scale, dimType);
    const isVertical = range.isVertical; // 标识该坐标轴是否是纵坐标

    Util.each(ticks, tick => {
      const point = coord.convert({
        x: isVertical ? 0 : tick.value,
        y: isVertical ? tick.value : 0
      });
      tickPoints.push(point);
    });

    return {
      start: range.start,
      end: range.end,
      tickPoints
    };
  }

  // 确定坐标轴的位置
  _getAxisPosition(coord, dimType, index) {
    const coordType = coord.type;
    let position = '';
    if (coord.isRect) {
      if (dimType === 'x') {
        position = 'bottom';
      } else if (dimType === 'y') {
        if (index) {
          position = 'right';
        } else {
          position = 'left';
        }
      }
    } else if (coordType === 'helix') {
      position = 'helix';
    } else if (dimType === 'x') {
      position = coord.isTransposed ? 'radius' : 'circle';
    } else {
      position = coord.isTransposed ? 'circle' : 'radius';
    }

    return position;
  }

  // 获取坐标轴构成的配置信息
  _getAxisDefaultCfg(coord, scale, type, position) {
    const self = this;
    let cfg = {};
    const options = self.options;
    const isShowTitle = !!(Global.axis[position] && Global.axis[position].title); // 用户全局禁用 title

    if (isShowTitle) {
      cfg.title = {
        text: scale.alias || scale.field
      };
    }
    cfg = Util.merge(true, {}, Global.axis[position], cfg, options[scale.field]);
    cfg.ticks = scale.getTicks();

    if (coord.isPolar && !scale.isCategory) {
      if (type === 'x') {
        cfg.ticks.pop();
      }
    }

    cfg.coord = coord;
    if (cfg.label && Util.isNil(cfg.label.autoRotate)) {
      cfg.label.autoRotate = true; // 允许自动旋转，避免重叠
    }
    return cfg;
  }

  // 确定坐标轴的配置信息
  _getAxisCfg(coord, scale, verticalScale, dimType, index = '') {
    const self = this;
    const position = self._getAxisPosition(coord, dimType, index);
    const cfg = self._getAxisDefaultCfg(coord, scale, dimType, position);
    if (cfg.grid && verticalScale) { // 生成 gridPoints
      const gridPoints = [];
      const verticalTicks = formatTicks(verticalScale.getTicks());
      // 没有垂直的坐标点时不会只栅格
      if (verticalTicks.length) {
        const ticks = cfg.ticks;
        Util.each(ticks, (tick, idx) => {
          const subPoints = [];
          let value = tick.value;
          if (cfg.grid.align === 'center') {
            value = self._getMiddleValue(value, ticks, idx);
          }
          if (!Util.isNil(value)) {
            const rangeX = coord.x;
            const rangeY = coord.y;
            Util.each(verticalTicks, verticalTick => {
              const x = dimType === 'x' ? value : verticalTick.value;
              let y = dimType === 'x' ? verticalTick.value : value;
              const point = coord.convert({
                x,
                y
              });
              if (coord.isPolar) {
                const center = coord.circleCentre;
                if (rangeY.start > rangeY.end) {
                  y = 1 - y;
                }
                point.flag = rangeX.start > rangeX.end ? 0 : 1;
                point.radius = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
              }
              subPoints.push(point);
            });
            gridPoints.push(subPoints);
          }
        });
      }
      cfg.grid.items = gridPoints;
      if (cfg.coord.type === 'map') {
        cfg.grid.smooth = true;
      }
    }
    return cfg;
  }

  _getHelixCfg(coord) {
    const helixCfg = {};
    const a = coord.a;
    const startAngle = coord.startAngle;
    const endAngle = coord.endAngle;
    const index = 100;
    const crp = [];
    for (let i = 0; i <= index; i++) {
      const point = coord.convert({
        x: i / 100,
        y: 0
      });
      crp.push(point.x);
      crp.push(point.y);
    }
    const axisStart = coord.convert({
      x: 0,
      y: 0
    });
    helixCfg.a = a;
    helixCfg.startAngle = startAngle;
    helixCfg.endAngle = endAngle;
    helixCfg.crp = crp;
    helixCfg.axisStart = axisStart;
    helixCfg.center = coord.center;
    helixCfg.innerRadius = coord.y.start; // 内半径
    return helixCfg;
  }

  _drawAxis(coord, scale, verticalScale, dimType, xAxis, index) {
    const container = this.container;
    let C; // 坐标轴类
    let appendCfg; // 每个坐标轴 start end 等绘制边界的信息

    if (coord.type === 'map' && dimType === 'x') {
      C = Axis.PolyLine;
      appendCfg = this._getPolyLineCfg(coord, scale, dimType);
    } else if (coord.type === 'cartesian') {
      C = Axis.Line;
      appendCfg = this._getLineCfg(coord, scale, dimType, index);
    } else if (coord.type === 'helix' && dimType === 'x') {
      C = Axis.Helix;
      appendCfg = this._getHelixCfg(coord);
    } else if (dimType === 'x') {
      C = Axis.Circle;
      appendCfg = this._getCircleCfg(coord);
    } else {
      C = Axis.Line;
      appendCfg = this._getRadiusCfg(coord);
    }

    let cfg = this._getAxisCfg(coord, scale, verticalScale, dimType, index);
    cfg = Util.mix({}, cfg, appendCfg);

    if (dimType === 'y' && xAxis && xAxis.get('type') === 'circle') {
      cfg.circle = xAxis;
    }
    return container.addGroup(C, cfg);
  }

  createAxis(xScale, yScales) {
    const self = this;
    const coord = this.coord;
    const coordType = coord.type;

    // theta坐标系默认不绘制坐标轴
    if (coordType !== 'theta' && !(coordType === 'polar' && coord.isTransposed)) {
      let xAxis;
      if (xScale && !self._isHide(xScale.field)) {
        xAxis = self._drawAxis(coord, xScale, yScales[0], 'x'); // 绘制 x 轴
      }
      if (!Util.isEmpty(yScales) && coordType !== 'helix') {
        Util.each(yScales, (yScale, index) => {
          if (!self._isHide(yScale.field)) {
            self._drawAxis(coord, yScale, xScale, 'y', xAxis, index);
          }
        });
      }
    }
  }
}

module.exports = AxisController;
