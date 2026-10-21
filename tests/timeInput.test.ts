import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { to12h } from '../src/components/common/TimeInput';

describe('12-hour display of IST shift times', () => {
  test('converts the 24-hour IST strings people enter', () => {
    assert.equal(to12h('09:00'), '9:00 AM');
    assert.equal(to12h('17:30'), '5:30 PM');
    assert.equal(to12h('12:00'), '12:00 PM');
    assert.equal(to12h('00:05'), '12:05 AM');
    assert.equal(to12h('19:00'), '7:00 PM');
    assert.equal(to12h('23:59'), '11:59 PM');
  });

  test('never throws on empty or malformed values', () => {
    assert.equal(to12h(''), '—');
    assert.equal(to12h(undefined), '—');
    assert.equal(to12h('7pm'), '7pm');
  });
});
