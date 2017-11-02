const expect = require('chai').expect;
const auto = require('../../../../src/scale/auto/number');

describe('test number auto', () => {

  it('no interval', () => {
    const rst = auto({
      min: 0,
      max: 10
    });
    expect(rst.ticks).eql([ 0, 2, 4, 6, 8, 10 ]);

  });

  it('no interval not nice', () => {
    const rst = auto({
      min: 1,
      max: 9.5
    });
    expect(rst.ticks).eql([ 0, 2, 4, 6, 8, 10 ]);
  });

  it('no interval, max : 11', () => {
    const rst = auto({
      min: 1,
      max: 11
    });
    expect(rst.ticks).eql([ 0, 2, 4, 6, 8, 10, 12 ]);
  });

  it('with interval', () => {
    const rst = auto({
      min: 0,
      interval: 5,
      max: 10
    });
    expect(rst.ticks).eql([ 0, 5, 10 ]);
  });

  it('with interval not nice', () => {
    const rst = auto({
      min: 1.2,
      interval: 5,
      max: 8.5
    });
    expect(rst.ticks).eql([ 0, 5, 10 ]);
  });

  it('with interval not nice,larger', () => {
    const rst = auto({
      min: 1.2,
      interval: 5,
      max: 11.5
    });
    expect(rst.ticks).eql([ 0, 5, 10, 15 ]);
  });

  it('with interval, not the multiple of interval', () => {
    let rst = auto({
      min: 0,
      interval: 6,
      max: 10
    });
    expect(rst.ticks).eql([ 0, 6, 12 ]);

    rst = auto({
      min: 3,
      interval: 6,
      max: 11
    });
    expect(rst.ticks).eql([ 0, 6, 12 ]);
  });

  it('max< 0, min < 0', () => {
    const rst = auto({
      min: -100,
      interval: 20,
      max: -10
    });
    expect(rst.ticks).eql([ -100, -80, -60, -40, -20, -0 ]);
  });

  it('with count', () => {
    const rst = auto({
      min: 0,
      minCount: 3,
      maxCount: 4,
      max: 10
    });
    expect(rst.ticks).eql([ 0, 5, 10 ]);
  });

  it('with count', () => {
    const rst = auto({
      min: 0,
      minCount: 5,
      maxCount: 5,
      max: 4200
    });
    expect(rst.ticks).eql([ 0, 1200, 2400, 3600, 4800 ]);
  });

  it('max equals min', () => {
    let rst = auto({
      min: 100,
      max: 100
    });
    expect(rst.ticks).eql([ 0, 20, 40, 60, 80, 100 ]);

    rst = auto({
      min: 0,
      max: 0
    });
    expect(rst.ticks).eql([ 0, 1 ]);
  });

  it('max equals min', () => {
    const rst = auto({
      min: -10,
      max: -10
    });
    expect(rst.max).eql(0);
    expect(rst.min).eql(-10);
  });

  it('very little', () => {
    const rst = auto({
      min: 0.0002,
      minCount: 3,
      maxCount: 4,
      max: 0.0010
    });

    expect(rst.ticks).eql([ 0, 0.0004, 0.0008, 0.0012 ]);
  });

  it('very little minus', () => {
    const rst = auto({
      min: -0.0010,
      minCount: 3,
      maxCount: 4,
      max: -0.0002
    });
    expect(rst.ticks).eql([ -0.0012, -0.0008, -0.0004, 0 ]);
  });

  it('tick count 5', () => {
    const rst = auto({
      min: -5,
      minCount: 5,
      maxCount: 5,
      max: 605
    });
    expect(rst.ticks).eql([ -160, 0, 160, 320, 480, 640 ]);
  });

  it('tick count 6', () => {
    const rst = auto({
      min: 0,
      minCount: 6,
      maxCount: 6,
      max: 100
    });
    expect(rst.ticks).eql([ 0, 20, 40, 60, 80, 100 ]);
  });
});
