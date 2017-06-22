/**
 * @fileOverview The extension function of stack ,which mixin to geom
 * @author dxq613@gmail.com
 */


const Util = require('../../util');
const Adjust = require('./adjust');

/**
 * 数据调整的基类
 * @class Adjust.Stack
 */
class Stack extends Adjust {
  /**
   * @override
   */
  getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    return Util.assign(cfg, {
      /**
       * 仅有一个维度调整时，总的高度
       * @type {Number}
       */
      height: null,
      /**
       * 单个点的大小
       * @type {Number}
       */
      size: 10,
      /**
       * 是否反序进行层叠
       * @type {Boolean}
       */
      reverseOrder: false,

      /**
       * @override
       */
      adjustNames: [ 'y' ] // Only support stack y
    });
  }

  processOneDimStack(dataArray) {
    const self = this;
    const xDim = self.xDim;
    const yDim = self.yDim || 'y';
    const height = self.height;

    const stackY = {};
    // 如果层叠的顺序翻转
    if (self.reverseOrder) {
      dataArray = dataArray.slice(0).reverse();
    }
    for (let i = 0; i < dataArray.length; i++) {
      // var preY = stackHeight;
      const data = dataArray[i];
      // cates
      for (let j = 0; j < data.length; j++) {
        const item = data[j];
        const size = item.size || self.size;
        const stackHeight = (size * 2) / height;
        const x = item[xDim];
        if (!stackY[x]) {
          stackY[x] = stackHeight / 2;
        }
        item[yDim] = stackY[x];
        stackY[x] += stackHeight;
      }
    }

  }

  processAdjust(dataArray) {
    const self = this;
    if (self.yDim) {
      self.processStack(dataArray);
    } else {
      self.processOneDimStack(dataArray);
    }
  }

  processStack(dataArray) {
    const self = this;
    const xDim = self.xDim;
    const yDim = self.yDim;
    const count = dataArray.length;
    const stackCache = {
      positive: {},
      negative: {}
    };
    // 层叠顺序翻转
    if (self.reverseOrder) {
      dataArray = dataArray.slice(0).reverse();
    }
    for (let i = 0; i < count; i++) {
      const data = dataArray[i];
      for (let j = 0; j < data.length; j++) {
        const item = data[j];
        const x = item[xDim];
        let y = item[yDim] || 0;
        const xkey = x.toString();
        y = Util.isArray(y) ? y[1] : y;
        const direction = y >= 0 ? 'positive' : 'negative';
        if (!stackCache[direction][xkey]) {
          stackCache[direction][xkey] = 0;
        }
        item[yDim] = [ stackCache[direction][xkey], y + stackCache[direction][xkey] ];
        stackCache[direction][xkey] += y;
      }
    }
  }
}

module.exports = Stack;
