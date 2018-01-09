const _ = require('lodash');

/**
 * isString tests a given string to be an actual String of at least 1 character
 *
 * @param  {String}  str Variable to verify
 * @return {Boolean}     true if str is an actual String of at least 1 character
 */
function isString(str) {
  return _.isString(str) && str.length > 0;
}

module.exports = {
  isString,
};
