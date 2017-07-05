const Util = require('../../util');
const Global = require('../../global');
const { Legend } = require('../../component/index');
const Shape = require('../../geom/shape/index');

const MARGIN = 16;
const MARGIN_LEGEND = 25;

class LegendController {
  constructor(cfg) {
    this.options = {};
    Util.mix(this, cfg);
    this.clear();
    const chart = this.chart;
    this.container = chart.get('canvas');
    this.plotRange = chart.get('plotRange');
  }

  clear() {
    const legends = this.legends;
    Util.each(legends, legendItems => {
      Util.each(legendItems, legend => {
        legend.remove();
      });
    });
    this.legends = {};
  }

  _isFiltered(scale, values, value) {
    if (!scale.isCategory) {
      return true;
    }
    let rst = false;
    value = scale.invert(value);
    Util.each(values, val => {
      rst = rst || scale.getText(val) === scale.getText(value);
      if (rst) {
        return false;
      }
    });
    return rst;
  }

  _alignLegend(legend, pre, region, position) {
    const self = this;
    const container = self.container;
    const canvas = container.get('canvas');
    const width = canvas.get('width');
    let height = canvas.get('height');
    const plotRange = self.plotRange;
    const offsetX = legend.get('offsetX') || 0;
    const offsetY = legend.get('offsetY') || 0;
    const bbox = legend.getBBox();
    let x = 0;
    let y = 0;

    if (position === 'left' || position === 'right') { // 垂直
      const legendWidth = region.maxWidth;
      if (plotRange) {
        height = plotRange.br.y;
        x = position === 'left' ? MARGIN : plotRange.br.x + MARGIN;
      } else {
        x = position === 'left' ? MARGIN : width - legendWidth + MARGIN;
      }

      y = height - bbox.height;
      if (pre) {
        y = pre.get('y') - bbox.height - MARGIN_LEGEND;
      }
    } else {
      let statrX = 0;

      if (plotRange) {
        statrX = plotRange.bl.x + ((plotRange.br.x - plotRange.bl.x) - region.totalWidth) / 2;
      }
      x = statrX;
      y = position === 'top' ? MARGIN : height - bbox.height - MARGIN;

      if (pre) {
        x = pre.get('x') + pre.getBBBox().width + MARGIN_LEGEND;
      }
    }
    legend.move(x + offsetX, y + offsetY);
  }

  _getRegion(legends) {
    let maxWidth = 0;
    let totalWidth = 0;
    Util.each(legends, function(legend) {
      const bbox = legend.getBBox();
      if (maxWidth < bbox.width) {
        maxWidth = bbox.width;
      }
      totalWidth += bbox.width;
    });
    return {
      maxWidth,
      totalWidth
    };
  }

  _addCategroyLegend(scale, attr, geom, filterVals, position) {
    const self = this;
    const field = scale.field;
    const legendOptions = self.options;
    const legends = self.legends;
    legends[position] = legends[position] || [];
    const container = self.container;
    const items = [];
    let size;
    const ticks = scale.getTicks();
    let shapeType = 'point';
    let shape = legendOptions.marker || (legendOptions[field] && legendOptions[field].marker) || 'circle';
    const plotRange = self.plotRange;
    const maxLength = (position === 'right' || position === 'left') ? plotRange.bl.y - plotRange.tr.y : plotRange.tr.x - plotRange.bl.x;

    Util.each(ticks, tick => {
      const text = tick.text;
      const name = text;
      const scaleValue = tick.value;
      const value = scale.invert(scaleValue);
      const cfg = {
        // isInCircle: geom.isInCircle()
      };
      const attrValue = attr.mapping(value).join('');
      const checked = filterVals ? self._isFiltered(scale, filterVals, scaleValue) : true;

      if (attr.type === 'color') {
        cfg.color = attrValue;
      } else if (attr.type === 'shape') {
        shapeType = geom.get('shapeType'); // || 'point';
        shape = attrValue;
      } else if (attr.type === 'size') {
        size = attrValue;
      }
      // 暂时先不开放自定义shape，仅允许更改现有的样式
      const shapeObject = Shape.getShapeFactory(shapeType);
      const marker = shapeObject.getMarkerCfg(shape, cfg);
      if (!Util.isNil(size)) {
        marker.radius = size;
      }
      items.push({
        name,
        checked,
        type: null,
        marker,
        value
      });
    });

    const legendCfg = Util.defaultsDeep({
      title: {
        text: scale.alias || scale.field
      },
      maxLength,
      items
    }, legendOptions[field] || legendOptions, Global.legend[position]);

    const legend = container.addGroup(Legend.Category, legendCfg);
    legends[position].push(legend);
    return legend;
  }

  _addContinuousLegend(scale, attr, position) {
    const self = this;
    const legends = self.legends;
    legends[position] = legends[position] || [];
    const container = self.container;
    const field = scale.field;
    const ticks = scale.getTicks();
    const items = [];
    let legend;
    let minValue;
    let maxValue;

    Util.each(ticks, tick => {
      const scaleValue = tick.value;
      const invertValue = scale.invert(scaleValue);
      const attrValue = attr.mapping(invertValue).join('');

      items.push({
        name: tick.text,
        attrValue,
        value: scaleValue
      });
      if (scaleValue === 0) {
        minValue = true;
      }
      if (scaleValue === 1) {
        maxValue = true;
      }
    });

    if (!minValue) {
      items.push({
        name: scale.getText(scale.invert(0)),
        attrValue: attr.mapping(0).join(''),
        value: 0
      });
    }
    if (!maxValue) {
      items.push({
        name: scale.getText(scale.invert(1)),
        attrValue: attr.mapping(1).join(''),
        value: 1
      });
    }

    const options = self.options;
    const legendCfg = Util.defaultsDeep({
      title: {
        text: scale.alias || scale.field
      },
      items,
      attr
    }, options[field], Global.legend[position], options);

    if (attr.type === 'color') {
      legend = container.addGroup(Legend.Color, legendCfg);
    } else if (attr.type === 'size') {
      legend = container.addGroup(Legend.Size, legendCfg);
    }

    legends[position].push(legend);
    return legend;
  }

  addLegend(scale, attr, geom, filterVals) {
    const self = this;
    const legendOptions = self.options;
    const field = scale.field;
    if (legendOptions[field] === false) { // 如果不显示此图例
      return null;
    }
    const fieldOption = legendOptions[field];
    let position;
    if (fieldOption && fieldOption.position) { // 如果对某个图例单独设置 position，则对 position 重新赋值
      position = fieldOption.position;
    } else {
      position = 'right';
    }
    if (scale.isLinear) {
      return self._addContinuousLegend(scale, attr, position);
    }

    return self._addCategroyLegend(scale, attr, geom, filterVals, position);
  }

  alignLegends() {
    const self = this;
    const legends = self.legends;
    Util.each(legends, (legendItems, position) => {
      const region = self._getRegion(legendItems);
      Util.each(legendItems, (legend, index) => {
        const pre = legendItems[index - 1];
        self._alignLegend(legend, pre, region, position);
      });
    });

    return this;
  }
}

module.exports = LegendController;
