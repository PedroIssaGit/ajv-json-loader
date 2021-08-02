const Ajv = require("ajv");
const loaderUtils = require("loader-utils");
const path = require("path");

const Ajv = require("ajv"); // version >= v7.0.0
const standaloneCode = require("ajv/dist/standalone").default;

// now you can
// write module code to file
const fs = require("fs");
const path = require("path");
fs.writeFileSync(path.join(__dirname, "/validate.js"), moduleCode);

// ... or require module from string
const requireFromString = require("require-from-string");
const standaloneValidate = requireFromString(moduleCode); // for a single default export

module.exports = function (schemaStr, sourceMap) {
  const done = this.async();

  const loadSchema = (uri) => {
    const filePath = path.resolve(this.context, uri);
    return new Promise(function (resolve, reject) {
      try {
        const schema = require(filePath);
        resolve(schema);
      } catch (e) {
        e.message = `Couldn't load schema: ${e.message}`;
        reject(e);
      }
    });
  };

  const defaultAjvOptions = { loadSchema };
  // Maybe will be used in future
  const options = loaderUtils.getOptions(this) || {};
  // { sourceCode: true } should not be overridden
  const ajvOptions = Object.assign({}, defaultAjvOptions, options.ajv || {}, {
    code: { source: true },
  });

  const ajv = new Ajv(ajvOptions);

  let schema;

  try {
    schema = JSON.parse(schemaStr);
  } catch (e) {
    e.message = "Schema is not a valid JSON: " + e.message;
    done(e);
    return;
  }
  const validate = ajv.compile(schema);
  if (validate) {
    // 1. generate module with a single default export (CommonJS and ESM compatible):
    let moduleCode = standaloneCode(ajv, validate);
    done(null, moduleCode, sourceMap);
  } else {
    done({ message: "Fail to compile schema" });
  }
};
