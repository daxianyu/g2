/**
 * @fileOverview The util method based on the lodash.
 * @author dxq613@gmail.com
 * @see https://github.com/lodash/lodash
 */

function _mix(dist, obj) {
  for (const k in obj) {
    if (obj.hasOwnProperty(k) && k !== 'constructor' && obj[k] !== undefined) {
      dist[k] = obj[k];
    }
  }
}

const Util = {
  each: require('lodash/each'),
  map: require('lodash/map'),
  isObject: require('lodash/isObject'),
  isNumber: require('lodash/isNumber'),
  isString: require('lodash/isString'),
  isFunction: require('lodash/isFunction'),
  isFinite: require('lodash/isFinite'),
  isBoolean: require('lodash/isBoolean'),
  isEmpty: require('lodash/isEmpty'),
  lowerFirst: require('lodash/lowerFirst'),
  upperFirst: require('lodash/upperFirst'),
  upperCase: require('lodash/upperCase'),
  isNil: require('lodash/isNil'),
  isArray: require('lodash/isArray'),
  isDate: require('lodash/isDate'),
  toArray: require('lodash/toArray'),
  indexOf: require('lodash/indexOf'),
  assign: require('lodash/assign'),
  groupBy: require('lodash/groupBy'),
  cloneDeep: require('lodash/cloneDeep'),
  maxBy: require('lodash/maxBy'),
  minBy: require('lodash/minBy'),
  round: require('lodash/round'),
  merge: require('lodash/merge'),
  filter: require('lodash/filter'),
  defaultsDeep: require('lodash/defaultsDeep'),
  isEqualWith: require('lodash/isEqualWith'),
  isEqual: require('lodash/isEqual'),
  replace: require('lodash/replace'),
  union: require('lodash/union'),
  pick: require('lodash/pick'),
  snapEqual(v1, v2) {
    return Math.abs(v1 - v2) < 0.001;
  },
  fixedBase(v, base) {
    const str = base.toString();
    const index = str.indexOf('.');
    if (index === -1) {
      return Math.round(v);
    }
    let length = str.substr(index + 1).length;
    if (length > 20) {
      length = 20;
    }
    return parseFloat(v.toFixed(length));
  },
  mix(dist, obj1, obj2, obj3) {
    if (obj1) {
      _mix(dist, obj1);
    }

    if (obj2) {
      _mix(dist, obj2);
    }

    if (obj3) {
      _mix(dist, obj3);
    }
    return dist;
  },
  inArray(arr, value) {
    return arr.indexOf(value) >= 0;
  },
  /**
   * 封装事件，便于使用上下文this,和便于解除事件时使用
   * @protected
   * @param  {Object} obj   对象
   * @param  {String} action 事件名称
   * @return {Function}        返回事件处理函数
   */
  wrapBehavior(obj, action) {
    const method = e => {
      obj[action](e);
    };
    obj['_wrap_' + action] = method;
    return method;
  },
  /**
   * 获取封装的事件
   * @protected
   * @param  {Object} obj   对象
   * @param  {String} action 事件名称
   * @return {Function}        返回事件处理函数
   */
  getWrapBehavior(obj, action) {
    return obj['_wrap_' + action];
  },
  /**
   * 将用户输入的 padding 转换成 [top, right, bottom, right] 的模式
   * @param  {Number|Array} padding 输入的padding
   * @return {Array} 四个padding 值
   */
  toAllPadding(padding) {
    let top = 0;
    let left = 0;
    let right = 0;
    let bottom = 0;

    if (Util.isNumber(padding) || Util.isString(padding)) {
      top = left = right = bottom = padding;
    } else if (Util.isArray(padding)) {
      top = padding[0];
      right = !Util.isNil(padding[1]) ? padding[1] : padding[0];
      bottom = !Util.isNil(padding[2]) ? padding[2] : padding[0];
      left = !Util.isNil(padding[3]) ? padding[3] : right;
    } else if (Util.isObject(padding)) {
      top = padding.top || 0;
      right = padding.right || 0;
      bottom = padding.bottom || 0;
      left = padding.left || 0;
    }
    return [ top, right, bottom, left ];
  },
  /**
   * 替换字符串中的字段.
   * @param {String} str 模版字符串
   * @param {Object} o json data
   * @return {String}     替换后的字符串
   */
  substitute(str, o) {
    if (!str || !o) {
      return str;
    }
    return str.replace(/\\?\{([^{}]+)\}/g, (match, name) => {
      if (match.charAt(0) === '\\') {
        return match.slice(1);
      }
      return (o[name] === undefined) ? '' : o[name];
    });
  }
};

Util.Array = {
  merge(dataArray) {
    let rst = [];
    for (let i = 0; i < dataArray.length; i++) {
      rst = rst.concat(dataArray[i]);
    }
    return rst;
  },
  values(data, name) {
    const rst = [];
    const tmpMap = {};
    for (let i = 0; i < data.length; i++) {
      const obj = data[i];
      const value = obj[name];
      if (!Util.isNil(value) && !tmpMap[value]) {
        rst.push(value);
        tmpMap[value] = true;
      }
    }
    return rst;
  },
  firstValue(data, name) {
    let rst = null;
    for (let i = 0; i < data.length; i++) {
      const obj = data[i];
      const value = obj[name];
      if (!Util.isNil(value)) {
        if (Util.isArray(value)) {
          rst = value[0];
        } else {
          rst = value;
        }
        break;
      }
    }
    return rst;
  },
  group(data, condition) {
    if (!condition) {
      return [ data ];
    }
    const groups = Util.Array.groupToMap(data, condition);
    const array = [];
    for (const i in groups) {
      array.push(groups[i]);
    }
    return array;
  },
  groupToMap(data, condition) {
    if (!condition) {
      return {
        0: data
      };
    }
    if (!Util.isFunction(condition)) {
      const paramsCondition = Util.isArray(condition) ? condition : condition.replace(/\s+/g, '').split('*');
      condition = function(row) {
        let unique = '';
        for (let i = 0, l = paramsCondition.length; i < l; i++) {
          unique += row[paramsCondition[i]] && row[paramsCondition[i]].toString();
        }
        return unique;
      };
    }
    const groups = Util.groupBy(data, condition);
    return groups;
  },
  remove(arr, obj) {
    const index = Util.indexOf(arr, obj);
    if (index !== -1) {
      arr.splice(index, 1);
    }
  }
};

module.exports = Util;
