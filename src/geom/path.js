/**
 * @fileOverview 路径图，无序的线图
 * @author dxq613@gmail.com
 */

const GeomBase = require('./base');

class Path extends GeomBase {
  /**
   * 获取默认的配置属性
   * @protected
   * @return {Object} 默认属性
   */
  getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    cfg.type = 'path';
    cfg.shapeType = 'line';
    return cfg;
  }

  draw(data, container, shapeFactory) {
    const cfg = this.getDrawCfg(data[0]);
    cfg.origin = data; // path,line 等图的origin 是整个序列
    cfg.points = data;
    shapeFactory.drawShape(cfg.shape, cfg, container);
  }
}

module.exports = Path;
