/**
 * @fileOverview G2 图表的入口文件
 * @author dxq613@gmail.com
 */

const Util = require('../util');
const View = require('./view');
const G = require('@ali/g');
const Canvas = G.Canvas;
const DomUtil = G.DomUtil;
const Component = require('../component/index');
const Controller = require('./controller/index');

function _isScaleExist(scales, compareScale) {
  let flag = false;
  Util.each(scales, scale => {
    const scaleValues = [].concat(scale.values);
    const compareScaleValues = [].concat(compareScale.values);
    if (scale.type === compareScale.type && scale.field === compareScale.field && scaleValues.sort().toString() === compareScaleValues.sort().toString()) {
      flag = true;
      return;
    }
  });

  return flag;
}

class Chart extends View {
  /**
   * 获取默认的配置属性
   * @protected
   * @return {Object} 默认属性
   */
  getDefaultCfg() {
    const viewCfg = super.getDefaultCfg();
    return Util.mix({
      id: null,
      forceFit: false,
      container: null,
      wrapperEl: null,
      canvas: null,
      width: 500,
      height: 500,
      padding: 50,
      backPlot: null,
      frontPlot: null,
      plotBackground: null,
      views: []
    }, viewCfg);
  }

  constructor(cfg) {
    super(cfg);
    this._initCanvas();
    this._initPlot();
  }

  _initCanvas() {
    let container = this.get('container');
    let width = this.get('width');
    const height = this.get('height');
    if (Util.isString(container)) {
      container = document.getElementById(container);
      this.set('container', container);
    }
    const wrapperEl = DomUtil.createDom('<div style="position:relative;"></div>');
    container.appendChild(wrapperEl);
    this.set('wrapperEl', wrapperEl);
    if (this.get('forceFit')) {
      width = DomUtil.getWidth(container);
    }
    const canvas = new Canvas({
      containerDOM: wrapperEl,
      width,
      height
    });
    this.set('canvas', canvas);
  }

  _initPlot() {
    this._initPlotBack(); // 最底层的是背景相关的 group
    const canvas = this.get('canvas');
    const backPlot = canvas.addGroup(); // 图表最后面的容器
    const plotContainer = canvas.addGroup(); // 图表所在的容器
    const frontPlot = canvas.addGroup(); // 图表前面的容器

    this.set('backPlot', backPlot);
    this.set('plotContainer', plotContainer);
    this.set('viewContainer', plotContainer);
    this.set('frontPlot', frontPlot);
  }

  _initPlotBack() {
    const canvas = this.get('canvas');
    const plotBack = canvas.addGroup(Component.Plot, {
      padding: this.get('padding'),
      plotBackground: this.get('plotBackground'),
      background: this.get('background')
    });
    this.set('plotBack', plotBack);
    this.set('plotRange', plotBack.get('plotRange'));
  }

  _renderLegends() {
    const options = this.get('options');
    if (Util.isNil(options.legends) || (options.legends !== false)) { // 没有关闭图例
      const legendController = new Controller.Legend({
        chart: this,
        options: options.legends || {},
        plotRange: this.get('plotRange')
      });
      this.set('legendController', legendController);

      const geoms = this.getAllGeoms();
      const scales = [];
      Util.each(geoms, geom => {
        const attrs = geom.getAttrsForLegend();
        Util.each(attrs, attr => {
          const type = attr.type;
          const scale = attr.getScale(type);
          if (scale.type !== 'identity' && !_isScaleExist(scales, scale)) {
            scales.push(scale);
            let filterVals;
            const field = scale.field;
            const geomView = geom.get('view');
            const filters = geomView.get('options').filters;
            if (filters && filters[field]) {
              filterVals = filters[field];
            }
            legendController.addLegend(scale, attr, geom, filterVals);
          }
        });
      });

      legendController.alignLegends();
    }
  }

  getAllGeoms() {
    let geoms = [];
    geoms = geoms.concat(this.get('geoms'));

    const views = this.get('views');
    Util.each(views, view => {
      geoms = geoms.concat(view.get('geoms'));
    });

    return geoms;
  }

  forceFit() {

  }

  view(cfg) {
    cfg = cfg || {};
    const viewContainer = this.get('viewContainer');
    cfg.parent = this;
    cfg.viewContainer = viewContainer.addGroup();
    cfg.backPlot = this.get('backPlot');
    cfg.frontPlot = this.get('frontPlot');
    const view = new View(cfg);
    this.get('views').push(view);
    return view;
  }
  /**
   * @override
   * 当前chart 的范围
   */
  getViewRegion() {
    const plotRange = this.get('plotRange');
    return {
      start: plotRange.bl,
      end: plotRange.tr
    };
  }

  legend(field, cfg) {
    const options = this.get('options');
    let legends;

    if (Util.isBoolean(field)) {
      legends = (field === false) ? false : cfg;
    } else if (Util.isObject(field)) {
      legends = field;
    } else {
      legends[field] = cfg;
    }
    Util.mix(options.legends, legends);

    return this;
  }

  clear() {
    const views = this.get('views');
    while (views.length > 0) {
      const view = views.shift();
      view.destroy();
    }
    super.clear();
    const canvas = this.get('canvas');
    canvas.draw();
    return this;
  }

  render() {
    const views = this.get('views');
    if (views.length) {
      Util.each(views, function(view) {
        view.render();
      });
    }

    super.render();
    const canvas = this.get('canvas');
    canvas.draw();
    return this;
  }

  destroy() {
    const canvas = this.get('canvas');
    const wrapperEl = this.get('wrapperEl');
    wrapperEl.parentNode.removeChild(wrapperEl);
    super.destroy();
    canvas.destroy();
  }
}

module.exports = Chart;
