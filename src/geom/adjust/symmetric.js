/**
 * @fileOverview The extension function of symmetric ,which mixin to geom
 * @author huangtonger@aliyun.com
 */

const Util = require('../../util');
const Adjust = require('./adjust');

class Symmetric extends Adjust {

  // 获取最大的y值
  _getMax(dim) {
    const self = this;
    const mergeData = self.mergeData;
    const maxRecord = Util.maxBy(mergeData, obj => obj[dim]);
    const maxValue = maxRecord[dim];
    const max = Util.isArray(maxValue) ? Math.max.apply(null, maxValue) : maxValue;
    return max;
  }

  // 获取每个字段最大的值
  _getXValuesMax() {
    const self = this;
    const yDim = self.yDim;
    const xDim = self.xDim;
    const cache = {};
    const mergeData = self.mergeData;
    Util.each(mergeData, function(obj) {
      const xValue = obj[xDim];
      const yValue = obj[yDim];
      const max = Util.isArray(yValue) ? Math.max.apply(null, yValue) : yValue;
      cache[xValue] = cache[xValue] || 0;
      if (cache[xValue] < max) {
        cache[xValue] = max;
      }
    });
    return cache;
  }

  // 入口函数
  processAdjust(dataArray) {
    const self = this;
    const mergeData = Util.Array.merge(dataArray);
    self.mergeData = mergeData;
    self._processSymmetric(dataArray);
    self.mergeData = null;
  }

  // 处理对称
  _processSymmetric(dataArray) {
    const self = this;
    const xDim = self.xDim;
    const yDim = self.yDim;
    const max = self._getMax(yDim);
    const first = dataArray[0][0];

    let cache;
    if (first && Util.isArray(first[yDim])) {
      cache = self._getXValuesMax();
    }
    Util.each(dataArray, function(data) {
      Util.each(data, function(obj) {
        const value = obj[yDim];
        let offset;
        if (Util.isArray(value)) {
          const xValue = obj[xDim];
          const valueMax = cache[xValue];
          offset = (max - valueMax) / 2;
          const tmp = [];
          /* eslint-disable no-loop-func */
          Util.each(value, function(subVal) { // 多个字段
            tmp.push(offset + subVal);
          });
          /* eslint-enable no-loop-func */
          obj[yDim] = tmp;
        } else {
          offset = (max - value) / 2;
          obj[yDim] = [ offset, value + offset ];
        }
      });
    });
  }
}

Util.assign(Symmetric.prototype, {
  cacheMax: null,
  adjustNames: [ 'y' ] // Only support stack y
});

module.exports = Symmetric;
