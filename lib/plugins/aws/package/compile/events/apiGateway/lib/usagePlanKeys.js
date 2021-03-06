'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');
const apiKeys = require('./apiKeys');

function createUsagePlanKeyResource(that, usagePlanLogicalId, keyNumber, keyName) {
  const apiKeyLogicalId = that.provider.naming.getApiKeyLogicalId(keyNumber, keyName);

  const resourceTemplate = {
    Type: 'AWS::ApiGateway::UsagePlanKey',
    Properties: {
      KeyId: {
        Ref: apiKeyLogicalId,
      },
      KeyType: 'API_KEY',
      UsagePlanId: {
        Ref: usagePlanLogicalId,
      },
    },
  };

  return _.cloneDeep(resourceTemplate);
}

module.exports = {
  compileUsagePlanKeys() {
    if (this.serverless.service.provider.apiKeys) {
      if (!Array.isArray(this.serverless.service.provider.apiKeys)) {
        throw new this.serverless.classes.Error('apiKeys property must be an array');
      }

      const resources = this.serverless.service.provider.compiledCloudFormationTemplate.Resources;
      let keyNumber = 0;

      this.serverless.service.provider.apiKeys.forEach(apiKeyDefinition => {
        // if multiple API key types are used
        const apiKey = Object.entries(apiKeyDefinition)[0];
        const name = apiKey[0];
        const value = _.last(apiKey);
        const usagePlansIncludeName = this.apiGatewayUsagePlanNames.includes(name);
        if (
          this.apiGatewayUsagePlanNames.length > 0 &&
          !usagePlansIncludeName &&
          _.isObject(value)
        ) {
          throw new this.serverless.classes.Error(`API key "${name}" has no usage plan defined`);
        }
        if (_.isObject(apiKeyDefinition) && usagePlansIncludeName) {
          keyNumber = 0;
          apiKeyDefinition[name].forEach(key => {
            if (!apiKeys.validateApiKeyInput(key)) {
              throw new this.serverless.classes.Error(
                'API Key must be a string or an object which contains name and/or value'
              );
            }
            keyNumber += 1;
            const usagePlanKeyLogicalId = this.provider.naming.getUsagePlanKeyLogicalId(
              keyNumber,
              name
            );
            const usagePlanLogicalId = this.provider.naming.getUsagePlanLogicalId(name);
            const resourceTemplate = createUsagePlanKeyResource(
              this,
              usagePlanLogicalId,
              keyNumber,
              name
            );
            _.merge(resources, {
              [usagePlanKeyLogicalId]: resourceTemplate,
            });
          });
        } else {
          keyNumber += 1;
          const usagePlanKeyLogicalId = this.provider.naming.getUsagePlanKeyLogicalId(keyNumber);
          const usagePlanLogicalId = this.provider.naming.getUsagePlanLogicalId();
          const resourceTemplate = createUsagePlanKeyResource(this, usagePlanLogicalId, keyNumber);
          _.merge(resources, {
            [usagePlanKeyLogicalId]: resourceTemplate,
          });
        }
      });
    }
    return BbPromise.resolve();
  },
};
