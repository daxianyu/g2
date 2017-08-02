const { Group } = require('@ali/g');
const Labels = require('../../component/label/index');
const Global = require('../../global');
const Util = require('../../util');
const IGNORE_ARR = [ 'line', 'point', 'path' ];
const ORIGIN = '_origin';

function avg(arr) {
  let sum = 0;
  Util.each(arr, function(value) {
    sum += value;
  });
  return sum / arr.length;
}

class GeomLabels extends Group {
  getDefaultCfg() {
    return {
      label: Global.label,
      /**
       * 用户传入的文本配置信息
       * @type {Object}
       */
      labelCfg: null,
      /**
       * 所在的坐标系
       * @type {Object}
       */
      coord: null,
      /**
       * 图表的类型
       * @type {String}
       */
      geomType: null,
      zIndex: 6
    };
  }

  _renderUI() {
    super._renderUI.call(this);
    this.initLabelsCfg();
    this.renderLabels(); // 调用入口文件
  }

  // 获取显示的 label 文本值
  _getLabelValue(record) {
    const self = this;
    const originRecord = record[ORIGIN];
    const labelCfg = self.get('labelCfg');
    const scales = labelCfg.scales;
    const callback = labelCfg.cfg && labelCfg.cfg.content;
    let value;
    if (callback) {
      const params = [];
      Util.each(scales, function(scale) {
        params.push(originRecord[scale.field]);
      });
      value = callback.apply(null, params);
    } else {
      const scale = scales[0];
      value = originRecord[scale.field];
      if (Util.isArray(value)) {
        const tmp = [];
        Util.each(value, function(subVal) {
          tmp.push(scale.getText(subVal));
        });
        value = tmp;
      } else {
        value = scale.getText(value);
      }
    }
    return value;
  }

  // 初始化labels的配置项
  initLabelsCfg() {
    const self = this;
    const labels = self.getDefaultLabelCfg();
    const labelCfg = self.get('labelCfg');
    Util.merge(labels, labelCfg.cfg);
    self.set('label', labels);
  }

  /**
   * @protected
   * 默认的文本样式
   * @return {Object} default label config
   */
  getDefaultLabelCfg() {
    const self = this;
    const labelCfg = self.get('labelCfg').cfg;
    const geomType = self.get('geomType');
    if (geomType === 'polygon' || (labelCfg && labelCfg.offset < 0 && Util.indexOf(IGNORE_ARR, geomType) === -1)) {
      return Util.merge({}, self.get('label'), Global.innerLabels);
    }
    return Util.merge({}, Global.label, self.get('label'));
  }

  /**
   * @protected
   * 获取labels
   * @param {Array} points points
   * @return {Array} label items
   */
  getLabelsItems(points) {
    const self = this;
    const items = [];
    const labels = self.get('label');
    const geom = self.get('geom');
    const xField = geom ? geom.getXScale().field : 'x';
    const yField = geom ? geom.getYScale().field : 'y';

    let origin;

    // 获取label相关的x，y的值，获取具体的x,y,防止存在数组
    Util.each(points, function(point) {
      origin = point._origin;
      let label = self._getLabelValue(point);
      if (!Util.isArray(label)) {
        label = [ label ];
      }
      const total = label.length;

      Util.each(label, function(sub, index) {
        let obj = self.getLabelPoint(label, point, index);
        if (obj) {
          obj = Util.merge({}, origin, obj); // 为了格式化输出
          let align;
          if (labels && labels.label && labels.label.textAlign) {
            align = labels.label.textAlign;
          } else {
            align = self.getLabelAlign(obj, index, total);
          }
          obj.textAlign = align;
          obj.id = self.get('id') + 'LabelText' + origin[xField] + ' ' + origin[yField] + obj.text;
          items.push(obj);
        }
      });
    });
    return items;
  }

  /**
   * @protected
   * 如果发生冲突则会调整文本的位置
   * @param {Array} items 文本的集合
   * @return {Array} adjusted items
   */
  adjustItems(items) {
    return items;
  }

  /**
   * 绘制连接到
   * @param {Array} items 文本项
   * @param {Object} labelLine 连接文本的线的配置项
   */
  drawLines() { /* items,labelLine */
  }

  /**
   * @protected
   * 获取文本的位置信息
   * @param {Array} labels labels
   * @param {Object} point point
   * @param {Number} index index
   * @return {Object} point
   */
  getLabelPoint(labels, point, index) {
    const self = this;

    function getDimValue(value, idx) {
      if (Util.isArray(value)) {
        if (labels.length === 1) { // 如果仅一个label,多个y,取最后一个y
          if (value.length <= 2) {
            value = value[value.length - 1];
          } else {
            value = avg(value);
          }
        } else {
          value = value[idx];
        }
      }
      return value;
    }
    const labelPoint = {
      x: getDimValue(point.x, index),
      y: getDimValue(point.y, index),
      text: labels[index]
    };

    const offsetPoint = self.getLabelOffset(labelPoint, index, labels.length);
    self.transLabelPoint(labelPoint);
    labelPoint.x += offsetPoint.x;
    labelPoint.y += offsetPoint.y;
    return labelPoint;
  }

  transLabelPoint(point) {
    const self = this;
    const coord = self.get('coord');
    const tmpPoint = coord.applyMatrix(point.x, point.y, 1);
    point.x = tmpPoint[0];
    point.y = tmpPoint[1];
  }

  getOffsetVector() {
    const self = this;
    const labelCfg = self.get('label');
    const offset = labelCfg.offset || 0;
    const coord = self.get('coord');
    let vector;
    if (coord.isTransposed) { // 如果x,y翻转，则偏移x
      vector = coord.applyMatrix(offset, 0);
    } else { // 否则，偏转y
      vector = coord.applyMatrix(0, offset);
    }
    return vector;
  }

  // 获取默认的偏移量
  getDefaultOffset() {
    const self = this;
    let offset = 0; // Global.labels.offset;

    const coord = self.get('coord');
    const vector = self.getOffsetVector();
    if (coord.isTransposed) { // 如果x,y翻转，则偏移x
      offset = vector[0];
    } else { // 否则，偏转y
      offset = vector[1];
    }
    return offset;
  }

  // 获取文本的偏移位置，x,y
  getLabelOffset(point, index, total) {
    const self = this;
    const offset = self.getDefaultOffset();
    const coord = self.get('coord');
    const transposed = coord.isTransposed;
    const yField = transposed ? 'x' : 'y';
    const factor = transposed ? 1 : -1; // y 方向上越大，像素的坐标越小，所以transposed时将系数变成
    const offsetPoint = {
      x: 0,
      y: 0
    };
    if (index > 0 || total === 1) { // 判断是否小于0
      offsetPoint[yField] = offset * factor;
    } else {
      offsetPoint[yField] = offset * factor * -1;
    }
    return offsetPoint;
  }

  getLabelAlign(point, index, total) {
    const self = this;
    let align = 'center';
    const coord = self.get('coord');
    if (coord.isTransposed) {
      const offset = self.getDefaultOffset();
      // var vector = coord.applyMatrix(offset,0);
      if (offset < 0) {
        align = 'right';
      } else if (offset === 0) {
        align = 'center';
      } else {
        align = 'left';
      }
      if (total > 1 && index === 0) {
        if (align === 'right') {
          align = 'left';
        } else if (align === 'left') {
          align = 'right';
        }
      }
    }
    return align;
  }

  showLabels(points) {
    const self = this;
    let items = self.getLabelsItems(points);
    const labels = self.get('label');
    items = self.adjustItems(items);
    self.resetLabels(items);
    if (labels.labelLine) {
      self.drawLines(items, labels.labelLine);
    }
  }

  destroy() {
    this.removeLabels(); // 清理文本
    super.destroy.call(this);
  }
}

Util.assign(GeomLabels.prototype, Labels.LabelsRenderer);

module.exports = GeomLabels;
