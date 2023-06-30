const loaderUtils = require("loader-utils");
const path = require("path");
const Ajv = require("ajv/dist/2019"); // version >= v7.0.0
const standaloneCode = require("ajv/dist/standalone").default;
const addFormats = require("ajv-formats");
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
  if(options.serverSide && options.ajv && options.ajv.allErrors){
    options.ajv.allErrors = false;
  }
  if(options.serverSide){
    defaultAjvOptions.allErrors = false;
  }
  const ajvOptions = Object.assign({}, defaultAjvOptions, options.ajv || {}, {
    code: { source: true },
  });

  let ajv = new Ajv(ajvOptions);
  if(!options.serverSide){
    require("ajv-errors")(ajv /*, {singleError: true} */);
  }
  addFormats(ajv);
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
