import crypto from 'crypto';
import { promisify } from 'util';
import { deflateRaw } from 'zlib';
import saml from '@boxyhq/saml20';
import xml2js from 'xml2js';
import xmlbuilder from 'xmlbuilder';
import * as dbutils from '../db/utils';
import { getDefaultCertificate } from '../saml/x509';
import { JacksonOption, SAMLConnection, SAMLResponsePayload, SLORequestParams, Storable } from '../typings';
import { JacksonError } from './error';
import * as redirect from './oauth/redirect';
import { IndexNames } from './utils';

const deflateRawAsync = promisify(deflateRaw);

const relayStatePrefix = 'boxyhq_jackson_';
const logoutXPath = "/*[local-name(.)='LogoutRequest']";

export class LogoutController {
  private connectionStore: Storable;
  private sessionStore: Storable;
  private opts: JacksonOption;

  constructor({ connectionStore, sessionStore, opts }) {
    this.opts = opts;
    this.connectionStore = connectionStore;
    this.sessionStore = sessionStore;
  }

  // Create SLO Request
  public async createRequest({ nameId, tenant, product, redirectUrl }: SLORequestParams) {
    let samlConnection: SAMLConnection | null = null;

    if (tenant && product) {
      const samlConnections = (
        await this.connectionStore.getByIndex({
          name: IndexNames.TenantProduct,
          value: dbutils.keyFromParts(tenant, product),
        })
      ).data;

      if (!samlConnections || samlConnections.length === 0) {
        throw new JacksonError('SAML connection not found.', 403);
      }

      samlConnection = samlConnections[0];
    }

    if (!samlConnection) {
      throw new JacksonError('SAML connection not found.', 403);
    }

    const {
      idpMetadata: { slo, provider },
    } = samlConnection;

    const { privateKey, publicKey } = await getDefaultCertificate();

    if ('redirectUrl' in slo === false && 'postUrl' in slo === false) {
      throw new JacksonError(`${provider} doesn't support SLO or disabled by IdP.`, 400);
    }

    const { id, xml } = buildRequestXML(nameId, this.opts.samlAudience!, slo.redirectUrl as string);
    const sessionId = crypto.randomBytes(16).toString('hex');

    let logoutUrl: string | null = null;
    let logoutForm: string | null = null;

    const relayState = relayStatePrefix + sessionId;
    const signedXML = await signXML(xml, privateKey, publicKey);

    await this.sessionStore.put(sessionId, {
      id,
      redirectUrl,
    });

    // HTTP-Redirect binding
    if ('redirectUrl' in slo) {
      logoutUrl = redirect.success(slo.redirectUrl as string, {
        SAMLRequest: Buffer.from(await deflateRawAsync(signedXML)).toString('base64'),
        RelayState: relayState,
      });
    }

    // HTTP-POST binding
    if ('postUrl' in slo) {
      logoutForm = saml.createPostForm(slo.postUrl as string, [
        {
          name: 'RelayState',
          value: relayState,
        },
        {
          name: 'SAMLRequest',
          value: Buffer.from(signedXML).toString('base64'),
        },
      ]);
    }

    return { logoutUrl, logoutForm };
  }

  // Handle SLO Response
  public async handleResponse({ SAMLResponse, RelayState }: SAMLResponsePayload) {
    const rawResponse = Buffer.from(SAMLResponse, 'base64').toString();

    const sessionId = RelayState.replace(relayStatePrefix, '');
    const session = await this.sessionStore.get(sessionId);

    if (!session) {
      throw new JacksonError('Unable to validate state from the origin request.', 403);
    }

    const parsedResponse = await parseSAMLResponse(rawResponse);

    if (parsedResponse.status !== 'urn:oasis:names:tc:SAML:2.0:status:Success') {
      throw new JacksonError(`SLO failed with status ${parsedResponse.status}.`, 400);
    }

    if (parsedResponse.inResponseTo !== session.id) {
      throw new JacksonError(`SLO failed with mismatched request ID.`, 400);
    }

    const samlConnections = (
      await this.connectionStore.getByIndex({
        name: IndexNames.EntityID,
        value: parsedResponse.issuer,
      })
    ).data;

    if (!samlConnections || samlConnections.length === 0) {
      throw new JacksonError('SAML connection not found.', 403);
    }

    const { idpMetadata, defaultRedirectUrl }: SAMLConnection = samlConnections[0];

    if (!(await saml.validateSignature(rawResponse, null, idpMetadata.thumbprint))) {
      throw new JacksonError('Invalid signature.', 403);
    }

    try {
      await this.sessionStore.delete(sessionId);
    } catch (_err) {
      // Ignore
    }

    return {
      redirectUrl: session.redirectUrl ?? defaultRedirectUrl,
    };
  }
}

// Create the XML for the SLO Request
const buildRequestXML = (nameId: string, providerName: string, sloUrl: string) => {
  const id = '_' + crypto.randomBytes(10).toString('hex');

  const xml: Record<string, any> = {
    'samlp:LogoutRequest': {
      '@xmlns:samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
      '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
      '@ID': id,
      '@Version': '2.0',
      '@IssueInstant': new Date().toISOString(),
      '@Destination': sloUrl,
      'saml:Issuer': {
        '#text': providerName,
      },
      'saml:NameID': {
        '@Format': 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        '#text': nameId,
      },
    },
  };

  return {
    id,
    xml: xmlbuilder.create(xml).end({}),
  };
};

// Parse SAMLResponse
const parseSAMLResponse = async (
  rawResponse: string
): Promise<{
  id: string;
  issuer: string;
  status: string;
  destination: string;
  inResponseTo: string;
}> => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(
      rawResponse,
      { tagNameProcessors: [xml2js.processors.stripPrefix] },
      (err: Error, { LogoutResponse }) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          issuer: LogoutResponse.Issuer[0]._,
          id: LogoutResponse.$.ID,
          status: LogoutResponse.Status[0].StatusCode[0].$.Value,
          destination: LogoutResponse.$.Destination,
          inResponseTo: LogoutResponse.$.InResponseTo,
        });
      }
    );
  });
};

// Sign the XML
const signXML = async (xml: string, signingKey: string, publicKey: string): Promise<string> => {
  return await saml.sign(xml, signingKey, publicKey, logoutXPath);
};
