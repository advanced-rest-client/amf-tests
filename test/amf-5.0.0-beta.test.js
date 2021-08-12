import { assert } from 'chai';
import amf from 'amf-client-js';

amf.plugins.document.WebApi.register();
amf.plugins.document.Vocabularies.register();
amf.plugins.features.AMFValidation.register();

describe('AMF issues - APIC', function() {
  before(async () => {
    await amf.Core.init();
  });

  /**
   * @param {string} file 
   * @returns {Promise<any>}
   */
  async function generate(file) {
    const parser = new amf.Raml10Parser();
    const resolver = new amf.Raml10Resolver();
    const renderer = new amf.AmfGraphRenderer();

    let parsed = await parser.parseFileAsync(file);
    const vResult = await amf.AMF.validate(parsed, amf.ProfileNames.RAML, undefined);
    if (!vResult.conforms) {
      /* eslint-disable-next-line no-console */
      console.log(vResult.toString());
    }

    // resolving
    parsed = resolver.resolve(parsed, 'editing');

    // serialization
    const ro = new amf.render.RenderOptions().withSourceMaps.withCompactUris.withPrettyPrint;
    const str = await renderer.generateString(parsed, ro);
    return JSON.parse(str)[0];
  }

  describe('json schema', () => {
    /** @type any */
    let graph;

    before(async () => {
      graph = await generate('file://apis/schemas/json-schema.raml');
    });

    it('has parsed-json-schema on the source map', () => {
      const encodes = graph['doc:encodes'][0];
      const endpoint = encodes['apiContract:endpoint'][0];
      const operation = endpoint['apiContract:supportedOperation'][0];
      const request = operation['apiContract:expects'][0];
      const payload = request['apiContract:payload'][0];
      const schema = payload['raml-shapes:schema'][0];
      const sourceMap = schema['sourcemaps:sources'][0];
      assert.ok(sourceMap['sourcemaps:parsed-json-schema'], 'has parsed JSON schema');

      // the problem in this ld+json is that there is no connection between the payload's
      // schema and the object defined in `#references`, which have the `raw` value. 
      // This `raw` value is rendered in the API console in the schema documentation module.

      // Previously (not sure which version) the source map contained the `raw` value with the JSON schema.
    });
  });
});
