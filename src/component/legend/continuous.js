const Util = require('../../util');
const Base = require('./base');
const { Event, Group } = require('@ali/g');
const Slider = require('./slider');
const TRIGGER_WIDTH = 10;

class Continuous extends Base {
  getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    return Util.mix({}, cfg, {
      /**
       * 类型
       * @type {String}
       */
      type: 'continuous-legend',
      /**
       * 子项
       * @type {Array}
       */
      items: null,
      /**
       * 布局方式
       * horizontal 水平
       * vertical 垂直
       * @type {String}
       */
      layout: 'vertical',
      /**
       * 宽度
       * @type {Number}
       */
      width: 200,
      /**
       * 高度
       * @type {Number}
       */
      height: 20,
      /**
       * 标题偏移量
       * @type {Number}
       */
      titleGap: 10,
      /**
       * 默认文本图形属性
       * @type {ATTRS}
       */
      textStyle: {
        fill: '#333',
        textAlign: 'center',
        textBaseline: 'middle'
      },
      /**
       * 连续图例是否可滑动
       * @type {Boolean}
       */
      slidable: true,
      /**
       * 范围内颜色
       * @type {ATTRS}
       */
      inRange: {
        fill: '#4E7CCC'
      },
      _range: [ 0, 100 ],
      /**
       * 中滑块属性
       * @type {ATTRS}
       */
      middleAttr: {
        fill: '#fff',
        fillOpacity: 0
      },
      outRangeStyle: {
        fill: '#ccc'
      },
      labelOffset: 10 // ToDO: 文本同渐变背景的距离
    });
  }

  _calStartPoint() {
    const start = {
      x: 0,
      y: this.get('titleGap')
    };
    const titleShape = this.get('titleShape');
    if (titleShape) {
      const titleBox = titleShape.getBBox();
      start.y += titleBox.height;
    }

    return start;
  }

  _beforeRenderUI() {
    const items = this.get('items');
    if (!Util.isArray(items) || Util.isEmpty(items)) {
      return;
    }

    super._beforeRenderUI();
    this.set('firstItem', items[0]);
    this.set('lastItem', items[items.length - 1]);
  }

  _formatItemValue(value) {
    const formatter = this.get('itemFormatter');
    if (formatter) {
      value = formatter.call(this, value);
    }
    return value;
  }

  _renderUI() {
    super._renderUI();

    if (this.get('slidable')) {
      this._renderSlider();
    } else {
      this._renderBackground();
    }
  }

  _renderSlider() {
    const minHandleElement = new Group();
    const maxHandleElement = new Group();
    const backgroundElement = new Group();
    const start = this._calStartPoint();
    const slider = this.addGroup(Slider, {
      minHandleElement,
      maxHandleElement,
      backgroundElement,
      middleAttr: this.get('middleAttr'),
      layout: this.get('layout'),
      range: this.get('_range'),
      width: this.get('width'),
      height: this.get('height')
    });
    slider.translate(start.x, start.y);
    this.set('slider', slider);

    const shape = this._renderSliderShape();
    shape.attr('clip', slider.get('middleHandleElement'));
    this._renderTrigger();
  }

  _addBackground(parent, name, attrs) {
    parent.addShape(name, {
      attrs: Util.mix({}, attrs, this.get('outRangeStyle'))
    });
    return parent.addShape(name, {
      attrs
    });
  }

  _renderTrigger() {
    const min = this.get('firstItem');
    const max = this.get('lastItem');
    const layout = this.get('layout');
    const textStyle = this.get('textStyle');
    const inRange = this.get('inRange');
    const attrType = this.get('type');
    let minBlockAttr;
    let maxBlockAttr;

    if (attrType === 'color-legend') {
      minBlockAttr = {
        fill: min.color
      };
      maxBlockAttr = {
        fill: max.color
      };
    } else {
      minBlockAttr = Util.mix({}, inRange);
      maxBlockAttr = Util.mix({}, inRange);
    }
    const minTextAttr = Util.mix({
      text: min.name + ''
    }, textStyle);
    const maxTextAttr = Util.mix({
      text: max.name + ''
    }, textStyle);
    if (layout === 'vertical') {
      this._addVerticalTrigger('min', minBlockAttr, minTextAttr);
      this._addVerticalTrigger('max', maxBlockAttr, maxTextAttr);
    } else {
      this._addHorizontalTrigger('min', minBlockAttr, minTextAttr);
      this._addHorizontalTrigger('max', maxBlockAttr, maxTextAttr);
    }
  }

  _addVerticalTrigger(type, blockAttr, textAttr) {
    const slider = this.get('slider');
    const trigger = slider.get(type + 'HandleElement');
    const width = this.get('width');
    const button = trigger.addShape('polygon', {
      attrs: Util.mix({
        points: [
          [ (width / 2 + TRIGGER_WIDTH), 0 ],
          [ (width / 2 + 1), 0 ],
          [ (width / 2 + TRIGGER_WIDTH), type === 'min' ? TRIGGER_WIDTH : -TRIGGER_WIDTH ]
        ]
      }, blockAttr)
    });
    const text = trigger.addShape('text', {
      attrs: Util.mix(textAttr, {
        x: width + 8,
        y: type === 'max' ? -8 : 8,
        textAlign: 'start',
        textBaseline: 'middle'
      })
    });
    const layout = this.get('layout');
    const trigerCursor = layout === 'vertical' ? 'ns-resize' : 'ew-resize';
    button.set('cursor', trigerCursor);
    text.set('cursor', trigerCursor);
    this.set(type + 'ButtonElement', button);
    this.set(type + 'TextElement', text);
  }

  _addHorizontalTrigger(type, blockAttr, textAttr) {
    const slider = this.get('slider');
    const trigger = slider.get(type + 'HandleElement');
    const height = this.get('height');
    const button = trigger.addShape('polygon', {
      attrs: Util.mix({
        points: [
          [ 0, 0 ],
          [ 0, TRIGGER_WIDTH ],
          [ type === 'min' ? -TRIGGER_WIDTH : TRIGGER_WIDTH, TRIGGER_WIDTH ]
        ]
      }, blockAttr)
    });
    const text = trigger.addShape('text', {
      attrs: Util.mix(textAttr, {
        x: type === 'min' ? -TRIGGER_WIDTH / 2 : TRIGGER_WIDTH / 2,
        y: height + TRIGGER_WIDTH / 2,
        textAlign: type === 'min' ? 'end' : 'start',
        textBaseline: 'middle'
      })
    });
    const layout = this.get('layout');
    const trigerCursor = layout === 'vertical' ? 'ns-resize' : 'ew-resize';
    button.set('cursor', trigerCursor);
    text.set('cursor', trigerCursor);
    this.set(type + 'ButtonElement', button);
    this.set(type + 'TextElement', text);
  }

  _bindUI() {
    if (this.get('slidable')) {
      const self = this;
      const canvas = self.get('canvas');
      const slider = self.get('slider');
      slider.on('sliderchange', function(ev) {
        const range = ev.range;
        const firstItemValue = self.get('firstItem').name * 1;
        const lastItemValue = self.get('lastItem').name * 1;
        const minValue = firstItemValue + (range[0] / 100) * (lastItemValue - firstItemValue) + '';
        const maxValue = firstItemValue + (range[1] / 100) * (lastItemValue - firstItemValue) + '';
        self._updateElement(minValue, maxValue);
        const itemFiltered = new Event('legend:filter', ev);
        itemFiltered.range = [ minValue, maxValue ];
        canvas.trigger('legend:filter', [ itemFiltered ]);
      });
    }
  }

  _updateElement(min, max) {
    const minTextElement = this.get('minTextElement');
    const maxTextElement = this.get('maxTextElement');
    minTextElement.attr('text', min);
    maxTextElement.attr('text', max);
    /* if (this.get('type') === 'color-legend') {
      const attr = this.get('attr'); // 图形属性，为了更新滑块颜色
      const minButtonElement = this.get('minButtonElement');
      const maxButtonElement = this.get('maxButtonElement');
      minButtonElement.attr('fill', attr.mappingValues(min).join(''));
      maxButtonElement.attr('fill', attr.mappingValues(max).join(''));
    } */
  }
}

module.exports = Continuous;
