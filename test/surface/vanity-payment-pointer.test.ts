import { SolidLogic } from 'solid-logic';
import { getSolidLogicInstance, WEBID_ALICE } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';
import fetch from 'node-fetch';

async function setPaymentPointer(solidLogic, paymentPointer) {
  const body = '@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n' +
    '@prefix pp: <http://paymentpointers.org/ns#>.\n' +
    `<#me> pp:PaymentPointer "${paymentPointer}";\n` +
    '  acl:trustedApp [\n'+
    '    acl:mode acl:Append, acl:Control, acl:Read, acl:Write;\n'+
    '    acl:origin <https://tester>\n'+
    '  ].';
  const result = await solidLogic.fetch(solidLogic.me, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': 'text/turtle'
    }
  });
  expect(responseCodeGroup(result.status)).toEqual('2xx');
}

describe('Vanity Payment Pointer', () => {
  let solidLogicAlice: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
  });

  describe('Alice has a pp:PaymentPointer triple in her profile, no slash', () => {
    beforeAll(() => setPaymentPointer(solidLogicAlice, '$example.com'));
    it('makes /.well-known/pay redirects to it', async () => {
      const podRoot = new URL(solidLogicAlice.me).origin;
      const result = await fetch(`${podRoot}/.well-known/pay`, { redirect: 'manual' });
      expect(result.status).toEqual(302);
      expect(result.headers.get('Location')).toEqual('https://example.com/.well-known/pay');
    });
  });
  describe('Alice has a pp:PaymentPointer triple in her profile, with slash', () => {
    beforeAll(() => setPaymentPointer(solidLogicAlice, '$example.com/foo/bar'));
    it('makes /.well-known/pay redirects to it', async () => {
      const podRoot = new URL(solidLogicAlice.me).origin;
      const result = await fetch(`${podRoot}/.well-known/pay`, { redirect: 'manual' });
      expect(result.status).toEqual(302);
      expect(result.headers.get('Location')).toEqual('https://example.com/foo/bar');
    });
  });
});
