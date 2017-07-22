const Util = require('../../util');
const { defaultColor } = require('../../global');
const FIELD_ORIGIN = '_origin';

function getScaleName(scale) {
  return scale.alias || scale.field;
}

const TooltipMixin = {
  _snapEqual(v1, v2, scale) {
    let equals;
    v1 = scale.translate(v1);
    v2 = scale.translate(v2);

    if (scale.isCategory) {
      equals = v1 === v2;
    } else {
      equals = Util.equal(v1, v2);
    }
    return equals;
  },

  _getScaleValueByPoint(point) {
    let result = 0;
    const coord = this.get('coord');
    const xScale = this.getXScale();
    const invertPoint = coord.invert(point);
    let xValue = invertPoint.x;

    if (this.isInCircle() && xValue > (1 + xScale.rangeMax()) / 2) {
      xValue = xScale.rangeMin(); // 极坐标下，scale 的 range 被做过特殊处理 see view.js#L88
    }
    result = xScale.invert(xValue);

    if (xScale.isCategory) {
      result = xScale.translate(result); // 防止分类类型
    }

    return result;
  },

  _getOriginByPoint(point) {
    const xScale = this.getXScale();
    const yScale = this.getYScale();
    const xField = xScale.field;
    const yField = yScale.field;
    const coord = this.get('coord');
    const invertPoint = coord.invert(point);
    const xValue = xScale.invert(invertPoint.x);
    const yValue = yScale.invert(invertPoint.y);

    const result = {};
    result[xField] = xValue;
    result[yField] = yValue;
    return result;
  },

  _getScale(field) {
    const self = this;
    const scales = self.get('scales');
    let rst = null;

    Util.each(scales, scale => {
      if (scale.field === field) {
        rst = scale;
        return false;
      }
    });
    return rst;
  },

  // 获取值对应的度量
  _getTipValueScale() {
    const attrs = this.getAttrsForLegend();
    let scale;
    Util.each(attrs, function(attr) {
      const tmpScale = attr.getScale(attr.type);
      if (tmpScale.isLinear) { // 如果指定字段是非position的，同时是连续的
        scale = tmpScale;
        return false;
      }
    });

    const xScale = this.getXScale();
    const yScale = this.getYScale();

    if (!scale && yScale && yScale.field === '..y') {
      return xScale;
    }

    return scale || yScale || xScale;
  },

  _getTipTitleScale() {
    const self = this;
    const position = self.getAttr('position');
    const fields = position.getFields();
    let tmpField;
    Util.each(fields, function(field) {
      if (field.indexOf('..') === -1) {
        tmpField = field;
        return false;
      }
    });
    return self._getScale(tmpField);
  },

  _filterValue(arr, point) {
    const coord = this.get('coord');
    const yScale = this.getYScale();
    const yField = yScale.field;
    const invertPoint = coord.invert(point);
    let yValue = invertPoint.y;
    yValue = yScale.invert(yValue);
    let rst = arr[arr.length - 1];

    Util.each(arr, function(obj) {
      const origin = obj[FIELD_ORIGIN];
      if ((origin[yField][0] <= yValue) && (origin[yField][1] >= yValue)) {
        rst = obj;
        return false;
      }
    });
    return rst;
  },

  getXDistance() {
    const self = this;
    const xScale = self.getXScale();
    let distance;
    if (xScale.isCategory) {
      distance = 1;
    } else {
      const values = xScale.values;
      const length = values.length;
      // 应该是除以 length - 1
      distance = Math.abs(values[length - 1] - values[0]) / (length - 1);
    }
    return distance;
  },

  findPoint(point, frame) {
    const self = this;
    const xScale = self.getXScale();
    const yScale = self.getYScale();
    const xField = xScale.field;
    const yField = yScale.field;
    const frameArr = frame;
    let rst = null;

    const first = frameArr[0];
    let last = frameArr[frameArr.length - 1];

    if (!first) {
      return rst;
    }

    const value = self._getScaleValueByPoint(point); // 根据该点获得对应度量后数据的值
    const firstXValue = first[FIELD_ORIGIN][xField];
    const firstYValue = first[FIELD_ORIGIN][yField];
    const lastXValue = last[FIELD_ORIGIN][xField];
    const isYRange = yScale.isLinear && Util.isArray(firstYValue); // 考虑 x 维度相同，y 是数组区间的情况

    // 如果x的值是数组
    if (Util.isArray(firstXValue)) {
      Util.each(frameArr, function(record) {
        const origin = record[FIELD_ORIGIN];
        if (xScale.translate(origin[xField][0]) <= value && xScale.translate(origin[xField][1]) >= value) {
          if (isYRange) {
            if (!Util.isArray(rst)) {
              rst = [];
            }
            rst.push(record);
          } else {
            rst = record;
            return false;
          }
        }
      });
      if (Util.isArray(rst)) {
        rst = this._filterValue(rst, point);
      }
    } else {
      let next;
      if (!xScale.isLinear && xScale.type !== 'timeCat') {
        Util.each(frameArr, function(record, index) {
          const origin = record[FIELD_ORIGIN];
          if (self._snapEqual(origin[xField], value, xScale)) {
            if (isYRange) {
              if (!Util.isArray(rst)) {
                rst = [];
              }
              rst.push(record);
            } else {
              rst = record;
              return false;
            }
          } else if (xScale.translate(origin[xField]) <= value) {
            last = record;
            next = frameArr[index + 1];
          }
        });

        if (Util.isArray(rst)) {
          rst = this._filterValue(rst, point);
        }
      } else {
        if ((value > xScale.translate(lastXValue) || value < xScale.translate(firstXValue)) && (value > xScale.max || value < xScale.min)) {
          return null;
        }

        let firstIdx = 0;
        let lastIdx = frameArr.length - 1;
        let middleIdx;
        while (firstIdx <= lastIdx) {
          middleIdx = Math.floor((firstIdx + lastIdx) / 2);
          const item = frameArr[middleIdx][FIELD_ORIGIN][xField];
          if (self._snapEqual(item, value, xScale)) {
            return frameArr[middleIdx];
          }

          if (xScale.translate(item) <= xScale.translate(value)) {
            firstIdx = middleIdx + 1;
            last = frameArr[middleIdx];
            next = frameArr[middleIdx + 1];
          } else {
            if (lastIdx === 0) {
              last = frameArr[0];
            }
            lastIdx = middleIdx - 1;
          }
        }
      }

      if (last && next) { // 计算最逼近的
        if (Math.abs(xScale.translate(last[FIELD_ORIGIN][xField]) - value) > Math.abs(xScale.translate(next[FIELD_ORIGIN][xField]) - value)) {
          last = next;
        }
      }
    }

    const distance = self.getXDistance(); // 每个分类间的平均间距
    if (!rst && Math.abs(xScale.translate(last[FIELD_ORIGIN][xField]) - value) <= distance / 2) {
      rst = last;
    }

    return rst;
  },
  /**
   * @protected
   * 获取tooltip的标题
   * @param  {Object} origin 点的原始信息
   * @return {String} 提示信息的标题
   */
  getTipTitle(origin) {
    let tipTitle = '';
    const titleScale = this._getTipTitleScale();

    if (titleScale) {
      const value = origin[titleScale.field];
      tipTitle = titleScale.getText(value);
    } else if (this.get('type') === 'heatmap') { // 热力图在不存在 title 的时候特殊处理
      const xScale = this.getXScale();
      const yScale = this.getYScale();
      const xValue = xScale.getText(origin[xScale.field]);
      const yValue = yScale.getText(origin[yScale.field]);

      tipTitle = '( ' + xValue + ', ' + yValue + ' )';
    }
    return tipTitle;
  },

  getTipValue(origin, valueScale) {
    let value;
    const field = valueScale.field;
    value = origin[field];

    if (Util.isArray(value)) {
      const tmp = [];
      Util.each(value, function(sub) {
        tmp.push(valueScale.getText(sub));
      });
      value = tmp.join('-');
    } else {
      value = valueScale.getText(value);
    }
    return value;
  },
  /**
   * @protected
   * 获取tooltip的名称
   * @param  {Object} origin 点的原始信息
   * @return {String} 提示信息的名称
   */
  getTipName(origin) {
    let name;
    let nameScale;
    const groupScales = this._getGroupScales();
    if (groupScales.length) { // 如果存在分组类型，取第一个分组类型
      Util.each(groupScales, function(scale) {
        nameScale = scale;
        return false;
      });
    }
    if (nameScale) {
      const field = nameScale.field;
      name = nameScale.getText(origin[field]);
    } else {
      const valueScale = this._getTipValueScale();
      name = getScaleName(valueScale);
    }
    return name;
  },
  /**
   * 获取点对应tooltip的信息
   * @protected
   * @param  {Object} point 原始的数据记录
   * @param  {Object} cfg tooltipTitle 配置信息
   * @return {Array}  一条或者多条记录
   */
  getTipItems(point) {
    const self = this;
    const origin = point[FIELD_ORIGIN];
    const tipTitle = self.getTipTitle(origin);
    const tooltipFields = self.get('tooltipFields');
    const items = [];
    let name;
    let value;

    function addItem(itemName, itemValue) {
      if (!Util.isNil(itemValue) && itemValue !== '') { // 值为null的时候，忽视
        const item = {
          title: tipTitle,
          point,
          name: itemName || tipTitle,
          value: itemValue,
          color: point.color || defaultColor,
          marker: true
        };
        if (self.get('type') === 'interval' || self.get('type') === 'schema') {
          item.size = self.getSize();
        }
        items.push(item);
      }
    }

    if (tooltipFields) {
      Util.each(tooltipFields, function(field) {
        if (!Util.isNil(origin[field])) { // 字段数据为null ,undefined时不显示
          const scale = self._getScale(field);
          name = getScaleName(scale);
          value = scale.getText(origin[field]);
          addItem(name, value);
        }
      });
    } else {
      const valueScale = self._getTipValueScale();
      if (!Util.isNil(origin[valueScale.field])) { // 字段数据为null ,undefined时不显示
        value = self.getTipValue(origin, valueScale);
        name = self.getTipName(origin);
        addItem(name, value);
      }
    }
    return items;
  },

  isShareTooltip() {
    let shareTooltip = this.get('shareTooltip');
    const type = this.get('type');
    const view = this.get('view');
    let options;
    if (view.get('parent')) {
      options = view.get('parent').get('options');
    } else {
      options = view.get('options');
    }
    if (options.tooltip && options.tooltip.split) {
      shareTooltip = false;
    }

    if (type === 'interval') {
      const coord = this.get('coord');
      const coordType = coord.type;
      if (coordType === 'theta' || (coordType === 'polar' && coord.isTransposed)) {
        shareTooltip = false;
      }
    } else if (!this.getYScale() || Util.inArray([ 'contour', 'point', 'polygon', 'edge', 'schema' ], type)) {
      shareTooltip = false;
    }
    return shareTooltip;
  }
};

module.exports = TooltipMixin;
