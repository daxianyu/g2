const Util = require('../../util');
const Base = require('./base');
const { vec2 } = require('@ali/g').MatrixUtil;

class Line extends Base {
  getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    return Util.mix({}, cfg, {
      /**
       * 辅助元素类型
       * @type {String}
       */
      type: 'line',
      // TODO 需要调整
      zIndex: 15,
      /**
       * 辅助线的起点位置
       * @type {Object | Function}
       */
      start: null,
      /**
       * 辅助线的终点位置
       * @type {Object | Function}
       */
      end: null,
      /**
       * 辅助线的图形样式
       * @type {Object}
       */
      lineStyle: {
        stroke: '#000',
        lineWidth: 1
      },
      /**
       * 辅助文本配置
       * @type {Object}
       */
      text: {
        position: 'end', // 文本的显示位置： start / center / end / 百分比
        autoRotate: true, // 文本是否沿着辅助线的方向自动旋转
        style: {
          fill: '#999',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'sans-serif'
        }, // 辅助文本的样式
        content: null // 辅助文本的文字
      }
    });
  }

  paint(coord, group) {
    const self = this;
    const start = self.parsePoint(coord, self.start);
    const end = self.parsePoint(coord, self.end);
    const guideLineGroup = group.addGroup();

    self._drawLines(start, end, guideLineGroup);
    if (this.text && this.text.content) {
      self._drawText(start, end, guideLineGroup);
    }
    guideLineGroup.set('zIndex', 15); // TODO: 需要确定数值
    guideLineGroup.name = 'guide-line';
  }

  _drawLines(start, end, group) {
    const startCompiler = Util.template('M ${ x } ${ y }');
    const endCompiler = Util.template('L ${ x } ${ y }');
    const path = startCompiler({ x: start.x, y: start.y }) + endCompiler({ x: end.x, y: end.y });

    group.addShape('Path', {
      attrs: Util.mix({
        path
      }, this.lineStyle)
    });
  }

  _drawText(start, end, group) {
    const textCfg = this.text;
    const position = textCfg.position;
    const textStyle = textCfg.style;

    let percent;
    if (position === 'start') {
      percent = 0;
    } else if (position === 'center') {
      percent = 0.5;
    } else if (Util.isString(position) && position.indexOf('%') !== -1) {
      percent = parseInt(position, 10) / 100;
    } else if (Util.isNumber(position)) {
      percent = position;
    } else {
      percent = 1;
    }

    if (percent > 1 || percent < 0) {
      percent = 1;
    }

    let cfg = {
      x: start.x + (end.x - start.x) * percent,
      y: start.y + (end.y - start.y) * percent
    };

    if (textCfg.offsetX) { // 设置了偏移量
      cfg.x += textCfg.offsetX;
    }

    if (textCfg.offsetY) { // 设置了偏移量
      cfg.y += textCfg.offsetY;
    }

    cfg.text = textCfg.content;
    cfg = Util.mix({}, cfg, textStyle);
    if (textCfg.autoRotate && !textStyle.rotate) {
      const angle = vec2.angleTo([ end.x - start.x, end.y - start.y ], [ 1, 0 ], 1);
      cfg.rotate = angle;
    } else if (textStyle.rotate) {
      cfg.rotate = (textStyle.rotate * Math.PI) / 180;
    }

    group.addShape('Text', {
      attrs: cfg
    });
  }
}

module.exports = Line;
