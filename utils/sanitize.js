// Request hardening for Express 5.
//
// The old stack (express-mongo-sanitize + xss-clean + hpp) re-assigns req.query,
// which is a read-only getter in Express 5, so those packages no longer work.
// These small replacements sanitise values in place instead, and the query string is
// sanitised inside Express' own "query parser" hook.
const qs = require('qs');
const xss = require('xss');

const isPlainObject = v =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

// Remove keys that start with "$" or contain "." (NoSQL operator injection),
// and strip dangerous HTML from every string (XSS). Mutates and returns `value`.
const clean = value => {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      value[i] = clean(item);
    });
    return value;
  }
  if (isPlainObject(value)) {
    Object.keys(value).forEach(key => {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        value[key] = clean(value[key]);
      }
    });
  }
  return value;
};

// HTTP parameter pollution: ?sort=a&sort=b becomes ?sort=b, except for whitelisted fields
const dedupe = (query, whitelist) => {
  Object.keys(query).forEach(key => {
    if (Array.isArray(query[key]) && !whitelist.includes(key)) {
      query[key] = query[key][query[key].length - 1];
    }
  });
  return query;
};

// app.set('query parser', createQueryParser([...whitelist]))
// "extended" parsing (qs) is needed for filters such as ?duration[gte]=5
exports.createQueryParser = (whitelist = []) => str =>
  clean(dedupe(qs.parse(str, { allowPrototypes: false }), whitelist));

// Sanitise req.body and req.params (both writable in Express 5)
exports.sanitizeBodyAndParams = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  next();
};

exports.clean = clean;
